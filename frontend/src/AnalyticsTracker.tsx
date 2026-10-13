import { useEffect } from "react";
import { trackEvent } from "./analytics";

const viewedSections = new Set<string>();
const sentScrollDepths = new Set<number>();

export default function AnalyticsTracker() {
  useEffect(() => {
    const timers = new Map<Element, number>();
    const visible = new Set<Element>();
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-analytics-section]"));

    const cancel = (element: Element) => {
      const timer = timers.get(element);
      if (timer !== undefined) window.clearTimeout(timer);
      timers.delete(element);
    };
    const schedule = (element: Element) => {
      const node = element as HTMLElement;
      const id = node.dataset.analyticsSection;
      if (!id || viewedSections.has(id) || timers.has(element) || document.hidden) return;
      timers.set(element, window.setTimeout(() => {
        timers.delete(element);
        if (!visible.has(element) || document.hidden || viewedSections.has(id)) return;
        const sent = trackEvent("section_view", {
          section_id: id,
          section_name: node.dataset.analyticsName,
          section_position: Number(node.dataset.analyticsPosition),
        });
        if (sent) viewedSections.add(id);
      }, 1000));
    };
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { visible.add(entry.target); schedule(entry.target); }
      else { visible.delete(entry.target); cancel(entry.target); }
    }), { threshold: 0.01 });
    sections.forEach((section) => observer.observe(section));
    const visibilityHandler = () => {
      if (document.hidden) timers.forEach((_, element) => cancel(element));
      else visible.forEach(schedule);
    };
    document.addEventListener("visibilitychange", visibilityHandler);

    let hasScrolled = false;
    let frame = 0;
    const measureScroll = () => {
      frame = 0;
      if (!hasScrolled) return;
      const height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      if (height <= 0) return;
      const percent = ((window.scrollY + window.innerHeight) / height) * 100;
      [25, 50, 75, 90].forEach((threshold) => {
        if (percent >= threshold && !sentScrollDepths.has(threshold)) {
          if (trackEvent("scroll_depth", { scroll_percent: threshold })) sentScrollDepths.add(threshold);
        }
      });
    };
    const requestMeasure = () => {
      if (!frame) frame = window.requestAnimationFrame(measureScroll);
    };
    const scrollHandler = () => { if (window.scrollY > 0) hasScrolled = true; requestMeasure(); };
    window.addEventListener("scroll", scrollHandler, { passive: true });
    window.addEventListener("resize", requestMeasure, { passive: true });
    const resizeObserver = new ResizeObserver(requestMeasure);
    resizeObserver.observe(document.documentElement);
    const consentHandler = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== "accepted") return;
      visible.forEach(schedule);
      requestMeasure();
    };
    window.addEventListener("montoyadigitalbond:cookie-consent", consentHandler);

    const clickHandler = (event: MouseEvent) => {
      const element = (event.target as Element | null)?.closest<HTMLElement>("[data-track-kind]");
      if (!element || element.getAttribute("aria-disabled") === "true" || (element instanceof HTMLButtonElement && element.disabled)) return;
      const data = element.dataset;
      if (data.trackKind === "navigation") {
        trackEvent("navigation_click", { button_id: data.trackId, target_section: data.trackTarget, placement: data.trackPlacement });
        return;
      }
      trackEvent("button_click", {
        section_id: data.trackSection,
        button_id: data.trackId,
        button_label: data.trackLabel,
        action_type: data.trackAction,
        placement: data.trackPlacement,
      });
      if (data.trackAction === "whatsapp") {
        trackEvent("whatsapp_click", { section_id: data.trackSection, button_id: data.trackId, placement: data.trackPlacement, source: data.trackSource || "landing" });
      }
    };
    document.addEventListener("click", clickHandler);

    return () => {
      observer.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
      document.removeEventListener("visibilitychange", visibilityHandler);
      window.removeEventListener("scroll", scrollHandler);
      window.removeEventListener("resize", requestMeasure);
      resizeObserver.disconnect();
      window.removeEventListener("montoyadigitalbond:cookie-consent", consentHandler);
      document.removeEventListener("click", clickHandler);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
