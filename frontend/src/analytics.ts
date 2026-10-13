export const GA4_MEASUREMENT_ID = "G-2D4N9MZ067";
const CONSENT_KEY = "montoyadigitalbond-cookie-consent-v1";

type AnalyticsEvent =
  | "section_view" | "scroll_depth" | "navigation_click" | "button_click" | "whatsapp_click"
  | "spark_open" | "spark_start" | "spark_proposal_view" | "spark_interest" | "generate_lead";

type EventParameters = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown> | IArguments>;
    __MDB_ANALYTICS_DEBUG__?: boolean;
  }
}

function hasAnalyticsConsent() {
  try {
    return document.documentElement.dataset.cookieConsent === "accepted"
      || window.localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return document.documentElement.dataset.cookieConsent === "accepted";
  }
}

export function trackEvent(event: AnalyticsEvent, parameters: EventParameters = {}) {
  try {
    if (!hasAnalyticsConsent() || !Array.isArray(window.dataLayer)) return false;
    const safeParameters = Object.fromEntries(Object.entries(parameters).filter(([, value]) => value !== undefined));
    window.dataLayer.push({
      event,
      ...safeParameters,
      ...(window.__MDB_ANALYTICS_DEBUG__ === true ? { debug_mode: true } : {}),
    });
    return true;
  } catch {
    // Analytics nunca debe afectar la experiencia principal.
    return false;
  }
}
