import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowDown,
  ArrowRight,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Menu,
  MessageCircle,
  Network,
  Sparkles,
  Workflow,
  X,
} from "lucide-react";
import "./styles.css";

const WHATSAPP_BASE = "https://wa.me/573042206989";
const LINKEDIN = "https://www.linkedin.com/in/andresmontoyavelez/";

const whatsappUrl = (message: string) =>
  `${WHATSAPP_BASE}?text=${encodeURIComponent(message)}`;

const generalWhatsapp = whatsappUrl(
  "Hola Andrés, vi MONTOYADIGITALBOND y quiero conversar sobre una mejora para mi negocio.",
);

const needs = [
  {
    id: "atencion",
    label: "Organizar mi atención",
    icon: MessageCircle,
    title: "Convierte cada solicitud en un caso con seguimiento.",
    description:
      "Organizamos tus canales, responsables, prioridades y tiempos para que tu equipo sepa qué atender y qué sigue.",
    message:
      "Hola Andrés, vi MONTOYADIGITALBOND y quiero organizar la atención al cliente de mi negocio.",
  },
  {
    id: "whatsapp",
    label: "Automatizar mi WhatsApp",
    icon: Bot,
    title: "Haz que tus conversaciones avancen.",
    description:
      "Diseñamos un flujo que resuelve preguntas, recoge datos y entrega la conversación a la persona indicada cuando hace falta.",
    message:
      "Hola Andrés, vi MONTOYADIGITALBOND y quiero automatizar la atención por WhatsApp de mi negocio.",
  },
  {
    id: "integraciones",
    label: "Conectar mis herramientas",
    icon: Network,
    title: "Deja que la información fluya entre tus aplicaciones.",
    description:
      "Conectamos tus herramientas para mover datos, enviar avisos y ejecutar tareas sin depender de procesos manuales repetitivos.",
    message:
      "Hola Andrés, vi MONTOYADIGITALBOND y quiero conectar las herramientas de mi negocio.",
  },
];

const solutions = [
  {
    number: "01",
    icon: MessageCircle,
    title: "Atención al cliente organizada y con seguimiento",
    description:
      "Implemento y optimizo Zendesk, conecto canales de atención y configuro flujos, prioridades, tiempos de respuesta y reportes.",
    benefit:
      "Claridad sobre qué atender, quién es responsable y qué está pendiente.",
  },
  {
    number: "02",
    icon: Bot,
    title: "WhatsApp que facilita la atención y la venta",
    description:
      "Diseño bots y flujos para responder preguntas frecuentes, recoger datos, orientar al cliente y facilitar el contacto con un asesor.",
    benefit:
      "Conversaciones que avanzan hacia una respuesta, una solicitud o una oportunidad comercial.",
  },
  {
    number: "03",
    icon: Workflow,
    title: "Automatización de tareas y conexión de herramientas",
    description:
      "Conecto aplicaciones y creo automatizaciones para mover información, enviar avisos y ejecutar tareas según las reglas de tu operación.",
    benefit:
      "Menos trabajo repetitivo e información disponible donde se necesita.",
  },
];

const steps = [
  "Entendemos tu necesidad y las herramientas que ya tienes.",
  "Definimos prioridades, alcance y forma de trabajo.",
  "Implementamos y probamos la solución.",
  "Te acompañamos con la entrega y capacitación acordadas.",
];

const hiring = [
  {
    title: "Mejoras puntuales",
    text: "Resolver una necesidad concreta con un objetivo claro.",
  },
  {
    title: "Proyectos",
    text: "Implementación con alcance y entregables definidos.",
  },
  {
    title: "Acompañamiento por horas",
    text: "Mejoras y evolución según prioridades acordadas.",
  },
];

const collaborations = [
  {
    name: "Vanti",
    logo: "/logos/vanti.webp",
    participation: "Implementación de mesa digital interna en Zendesk.",
    contribution: "Centralización de solicitudes internas, seguimiento de casos y organización de la atención.",
    url: "https://www.grupovanti.com/",
  },
  {
    name: "+Costos",
    logo: "/logos/mascostos.png",
    participation: "Product Owner y desarrollador de la aplicación.",
    contribution: "Conexión entre las necesidades del negocio, la evolución del producto y su implementación técnica.",
    url: "https://www.mascostos.com/login",
  },
  {
    name: "AppControl",
    logo: "/logos/appcontrol.svg",
    participation: "Integración de canales de WhatsApp con n8n.",
    contribution: "Automatización de comunicaciones y conexión de conversaciones con procesos de la aplicación.",
    url: "https://appcontrol.com.co/es/",
  },
  {
    name: "MIC",
    logo: "mic-group",
    participation: "Mejora continua de flujos en Zendesk.",
    contribution: "Organización y automatización de la gestión de solicitudes para facilitar el trabajo del equipo.",
    url: "https://www.mic.com.co/",
  },
  {
    name: "Vitals Foundation",
    logo: "/logos/vitals-foundation.png",
    participation: "Consultoría y apoyo en redes sociales, página web, eventos y voluntariado.",
    contribution: "Tecnología y comunicación digital al servicio de una iniciativa con propósito social.",
    url: "https://vitalsfoundation.org/",
  },
  {
    name: "Beyond Travel",
    logo: "/logos/beyond-travel.webp",
    participation: "Consultoría e implementación de bot para WhatsApp.",
    contribution: "Orientación sobre experiencias turísticas, captura de datos y continuidad de la atención con un asesor.",
    url: "https://beyondtravel.com.co/",
  },
];

function OrganizationLogo({ organization, lazy = false }: { organization: typeof collaborations[number]; lazy?: boolean }) {
  if (organization.logo === "mic-group") {
    return (
      <span className="mic-logo" role="img" aria-label="MIC, Little MIC y Movies">
        <img src="/logos/mic.webp" alt="" loading={lazy ? "lazy" : "eager"} />
        <img src="/logos/little-mic.svg" alt="" loading={lazy ? "lazy" : "eager"} />
        <img src="/logos/movies.webp" alt="" loading={lazy ? "lazy" : "eager"} />
      </span>
    );
  }

  return <img src={organization.logo} alt={`Logo de ${organization.name}`} loading={lazy ? "lazy" : "eager"} />;
}

function FlowGraphic({ variant, compact = false }: { variant: string; compact?: boolean }) {
  return (
    <div className={`flow-graphic flow-graphic--${variant}${compact ? " flow-graphic--compact" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 360 230" role="presentation">
        <path className="flow-graphic__path" d="M46 116 C100 28 162 202 222 112 S308 68 326 112" />
        <circle className="flow-graphic__pulse" cx="46" cy="116" r="8" />
        <circle cx="222" cy="112" r="7" />
        <circle cx="326" cy="112" r="9" />
      </svg>
      <span className="flow-node flow-node--one"><MessageCircle size={compact ? 18 : 23} /></span>
      <span className="flow-node flow-node--two">{variant === "integraciones" || variant === "automation" ? <Workflow size={compact ? 18 : 23} /> : <Bot size={compact ? 18 : 23} />}</span>
      <span className="flow-node flow-node--three">{variant === "atencion" || variant === "service" ? <Check size={compact ? 18 : 23} /> : <ArrowRight size={compact ? 18 : 23} />}</span>
      <small>{variant === "whatsapp" ? "Conversación → asesor" : variant === "integraciones" || variant === "automation" ? "Herramientas conectadas" : "Solicitud → seguimiento"}</small>
    </div>
  );
}

export default function App() {
  const [activeNeed, setActiveNeed] = useState(needs[0]);
  const [activeSolution, setActiveSolution] = useState(0);
  const [activeHiring, setActiveHiring] = useState(0);
  const [carouselPosition, setCarouselPosition] = useState(0);
  const [processVisible, setProcessVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const solutionRefs = useRef<(HTMLElement | null)[]>([]);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const processRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveSolution(Number((entry.target as HTMLElement).dataset.index));
      }),
      { rootMargin: "-24% 0px -48% 0px", threshold: 0.1 },
    );
    solutionRefs.current.forEach((element) => element && observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!processRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setProcessVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.22 });
    observer.observe(processRef.current);
    return () => observer.disconnect();
  }, []);

  const updateCarouselPosition = () => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const cards = Array.from(carousel.querySelectorAll<HTMLElement>(".experience-card"));
    const closest = cards.reduce((best, card, index) =>
      Math.abs(card.offsetLeft - carousel.scrollLeft) < Math.abs(cards[best].offsetLeft - carousel.scrollLeft) ? index : best, 0);
    setCarouselPosition(closest);
  };

  const moveCarousel = (direction: number) => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const card = carousel.querySelector<HTMLElement>(".experience-card");
    carousel.scrollBy({ left: direction * ((card?.offsetWidth ?? carousel.clientWidth) + 20), behavior: "smooth" });
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="site-shell">
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="MONTOYADIGITALBOND, inicio">
          <span>MONTOYA</span>
          <strong>DIGITAL BOND</strong>
        </a>
        <button
          className="menu-button"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">{menuOpen ? "Cerrar menú" : "Abrir menú"}</span>
          {menuOpen ? <X /> : <Menu />}
        </button>
        <nav id="main-navigation" className={menuOpen ? "nav is-open" : "nav"} aria-label="Navegación principal">
          <a href="#soluciones" onClick={closeMenu}>Soluciones</a>
          <a href="#experiencia" onClick={closeMenu}>Experiencia que respalda</a>
          <a href="#sobre-mi" onClick={closeMenu}>Sobre mí</a>
          <a href="#proceso" onClick={closeMenu}>Cómo trabajamos</a>
          <a className="button button--small" href={generalWhatsapp} target="_blank" rel="noreferrer" onClick={closeMenu}>
            Hablemos <ArrowRight size={17} />
          </a>
        </nav>
      </header>

      <main id="contenido">
        <section className="hero" id="inicio">
          <div className="hero__spark hero__spark--one" aria-hidden="true" />
          <div className="hero__spark hero__spark--two" aria-hidden="true" />
          <div className="hero__copy reveal">
            <p className="eyebrow"><Sparkles size={16} /> La chispa de la transformación digital</p>
            <h1>Mejora tu atención,<br />Automatiza tareas,<br /><em>Conecta tu negocio.</em></h1>
            <p className="hero__lead">
              Te ayudo a organizar tu atención al cliente y simplificar tu operación con soluciones digitales adaptadas a tu negocio. Desde una mejora puntual hasta una implementación completa.
            </p>
            <div className="hero__actions">
              <a className="button" href={generalWhatsapp} target="_blank" rel="noreferrer">
                Cuéntame qué necesitas <MessageCircle size={18} />
              </a>
              <a className="text-link" href="#soluciones">Explorar soluciones <ArrowDown size={17} /></a>
            </div>
          </div>
          <div className="hero__portrait reveal reveal--delay" aria-label="Retrato ilustrado de Andrés Montoya Vélez">
            <div className="portrait-orbit" aria-hidden="true" />
            <img src="/images/andres-montoya.webp" width="1000" height="1000" alt="Andrés Montoya Vélez, consultor en experiencia del cliente y automatización digital" fetchPriority="high" />
            <p className="portrait-caption"><span>Andrés Montoya Vélez</span> Producto · Procesos · Tecnología</p>
          </div>
        </section>

        <section className="logo-strip" aria-labelledby="organizations-title">
          <p id="organizations-title">Organizaciones con las que colaboro</p>
          <div className="logo-strip__grid">
            {collaborations.map((organization) => (
              <a key={organization.name} href={organization.url} target="_blank" rel="noreferrer" aria-label={`Visitar el sitio de ${organization.name}`}>
                <OrganizationLogo organization={organization} />
              </a>
            ))}
          </div>
        </section>

        <section className="needs section" aria-labelledby="needs-title">
          <div className="section-heading needs__heading">
            <p className="eyebrow eyebrow--dark">Empecemos por tu reto</p>
            <h2 id="needs-title">¿Qué quieres mejorar?</h2>
          </div>
          <div className="needs__tabs" role="tablist" aria-label="Necesidades">
            {needs.map((need) => {
              const Icon = need.icon;
              const selected = activeNeed.id === need.id;
              return (
                <button key={need.id} role="tab" aria-selected={selected} aria-controls={`panel-${need.id}`} id={`tab-${need.id}`} className={selected ? "need-tab is-active" : "need-tab"} onClick={() => setActiveNeed(need)}>
                  <Icon size={18} />{need.label}
                </button>
              );
            })}
          </div>
          <div className="need-panel" role="tabpanel" id={`panel-${activeNeed.id}`} aria-labelledby={`tab-${activeNeed.id}`} key={activeNeed.id}>
            <div className="need-panel__copy">
              <span className="need-panel__index">0{needs.findIndex((need) => need.id === activeNeed.id) + 1}</span>
              <h3>{activeNeed.title}</h3>
              <p>{activeNeed.description}</p>
              <a className="button button--dark" href={whatsappUrl(activeNeed.message)} target="_blank" rel="noreferrer">
                Hablemos de esto <MessageCircle size={18} />
              </a>
            </div>
            <FlowGraphic variant={activeNeed.id} />
          </div>
        </section>

        <section className="solutions section" id="soluciones" aria-labelledby="solutions-title">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow eyebrow--dark">Soluciones que aterrizan</p>
              <h2 id="solutions-title">De la necesidad<br />a una solución útil.</h2>
            </div>
            <p>Entiendo tu operación, propongo un camino y lo llevo a la práctica contigo.</p>
          </div>
          <div className="solutions-story">
            <aside className="solution-visual" aria-live="polite">
              <div className="solution-visual__label"><span>0{activeSolution + 1}</span> / 03</div>
              <FlowGraphic variant={["service", "whatsapp", "automation"][activeSolution]} />
              <p>{solutions[activeSolution].title}</p>
              <div className="solution-dots" aria-hidden="true">{solutions.map((_, index) => <span key={index} className={activeSolution === index ? "is-active" : ""} />)}</div>
            </aside>
            <div className="solution-stream">
              {solutions.map((solution, index) => {
                const Icon = solution.icon;
                return (
                  <article
                    className={activeSolution === index ? "solution-chapter is-active" : "solution-chapter"}
                    key={solution.number}
                    data-index={index}
                    ref={(element) => { solutionRefs.current[index] = element; }}
                  >
                    <div className="solution-chapter__mobile-graphic"><FlowGraphic variant={["service", "whatsapp", "automation"][index]} compact /></div>
                    <div className="solution-chapter__meta"><span>{solution.number}</span><Icon size={22} /></div>
                    <h3>{solution.title}</h3>
                    <p>{solution.description}</p>
                    <div className="benefit"><Check size={18} /><p>{solution.benefit}</p></div>
                  </article>
                );
              })}
            </div>
          </div>
          <div className="tool-line">
            <span>Herramientas de trabajo</span>
            <ul aria-label="Herramientas"><li>Zendesk</li><li>WhatsApp API</li><li>n8n</li><li>APIs</li><li>IA cuando aporta valor</li></ul>
          </div>
        </section>

        <section className="experience section" id="experiencia" aria-labelledby="experience-title">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow eyebrow--dark">Experiencia profesional</p>
              <h2 id="experience-title">Experiencia aplicada a proyectos reales</h2>
            </div>
            <p>Así aporto desde la consultoría, el desarrollo de producto y la implementación de soluciones digitales.</p>
          </div>
          <div
            className="experience-carousel"
            ref={carouselRef}
            onScroll={updateCarouselPosition}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") { event.preventDefault(); moveCarousel(1); }
              if (event.key === "ArrowLeft") { event.preventDefault(); moveCarousel(-1); }
            }}
            tabIndex={0}
            role="region"
            aria-label="Proyectos y organizaciones; usa las flechas izquierda y derecha para recorrer"
          >
            {collaborations.map((organization, index) => (
              <article className="experience-card" key={organization.name}>
                <div className="experience-card__head">
                  <div className="experience-card__logo"><OrganizationLogo organization={organization} lazy /></div>
                  <span>0{index + 1}</span>
                </div>
                <h3>{organization.name}</h3>
                <dl>
                  <div><dt>Participación</dt><dd>{organization.participation}</dd></div>
                  <div><dt>Aporte</dt><dd>{organization.contribution}</dd></div>
                </dl>
                <a href={organization.url} target="_blank" rel="noreferrer" aria-label={`Visitar el sitio de ${organization.name}`}>
                  Visitar sitio <ExternalLink size={15} />
                </a>
              </article>
            ))}
          </div>
          <div className="carousel-controls">
            <div className="carousel-arrows">
              <button type="button" onClick={() => moveCarousel(-1)} disabled={carouselPosition === 0} aria-label="Ver organización anterior"><ChevronLeft /></button>
              <button type="button" onClick={() => moveCarousel(1)} disabled={carouselPosition === collaborations.length - 1} aria-label="Ver organización siguiente"><ChevronRight /></button>
            </div>
            <div className="carousel-progress" aria-live="polite">
              <span>0{carouselPosition + 1}</span>
              <div>{collaborations.map((organization, index) => <i key={organization.name} className={carouselPosition === index ? "is-active" : ""} />)}</div>
              <span>0{collaborations.length}</span>
            </div>
          </div>
        </section>

        <section className="about" id="sobre-mi" aria-labelledby="about-title">
          <div className="about__visual">
            <img src="/images/montoyadigitalbond-wallpaper.webp" width="1600" height="900" alt="Identidad visual de MONTOYADIGITALBOND: Conecto ideas, transformo negocios" loading="lazy" />
          </div>
          <div className="about__copy section">
            <p className="eyebrow">Sobre mí</p>
            <h2 id="about-title">Tecnología con alguien que entiende tu operación.</h2>
            <p>Soy <strong>Andrés Montoya Vélez</strong>, consultor en experiencia del cliente y automatización digital. Mi trayectoria combina producto, procesos y tecnología para entender lo que necesita tu negocio y llevar las mejoras a la práctica.</p>
            <p>Te acompaño desde la definición del alcance hasta la implementación, las pruebas y la capacitación acordadas.</p>
            <a className="text-link text-link--light" href={LINKEDIN} target="_blank" rel="noreferrer">Conoce mi trayectoria en LinkedIn <ExternalLink size={17} /></a>
          </div>
        </section>

        <section ref={processRef} className={processVisible ? "process section is-visible" : "process section"} id="proceso" aria-labelledby="process-title">
          <div className="section-heading section-heading--split">
            <div><p className="eyebrow eyebrow--dark">Cómo trabajamos</p><h2 id="process-title">Un proceso claro,<br />de principio a fin.</h2></div>
            <p>Sin fórmulas genéricas: partimos de lo que ya tienes y de lo que realmente necesitas resolver.</p>
          </div>
          <div className="process-path">
            <svg viewBox="0 0 1000 190" preserveAspectRatio="none" aria-hidden="true"><path d="M40 118 C190 35 270 160 420 92 S680 36 960 105" /></svg>
            <ol className="process-list">
              {steps.map((step, index) => <li key={step} style={{ "--step": index } as CSSProperties}><span>0{index + 1}</span><p>{step}</p></li>)}
            </ol>
          </div>
          <p className="process-note"><Sparkles size={18} /> Durante el análisis inicial podemos avanzar con ajustes menores dentro de las horas acordadas.</p>
        </section>

        <section className="hiring section" aria-labelledby="hiring-title">
          <div className="hiring__intro"><p className="eyebrow">A tu medida</p><h2 id="hiring-title">Formas de trabajar juntos</h2></div>
          <div className="hiring-selector">
            <div className="hiring-options" role="tablist" aria-label="Formas de contratación">
              {hiring.map((item, index) => (
                <button key={item.title} type="button" role="tab" aria-selected={activeHiring === index} aria-controls={`hiring-panel-${index}`} id={`hiring-tab-${index}`} className={activeHiring === index ? "is-active" : ""} onClick={() => setActiveHiring(index)}>
                  <span>0{index + 1}</span>{item.title}
                </button>
              ))}
            </div>
            <div className="hiring-panel" role="tabpanel" id={`hiring-panel-${activeHiring}`} aria-labelledby={`hiring-tab-${activeHiring}`} key={activeHiring}>
              <p>{hiring[activeHiring].text}</p>
              <a className="button" href={whatsappUrl(`Hola Andrés, vi MONTOYADIGITALBOND y quiero conversar sobre la modalidad de ${hiring[activeHiring].title.toLowerCase()}.`)} target="_blank" rel="noreferrer">
                Conversemos sobre esta opción <MessageCircle size={18} />
              </a>
            </div>
          </div>
        </section>

        <section className="closing section">
          <div className="closing__spark" aria-hidden="true"><Sparkles /></div>
          <p className="eyebrow">El siguiente paso</p>
          <h2>Tu próxima mejora puede empezar con una conversación.</h2>
          <p>Cuéntame qué quieres resolver y revisemos cómo puedo ayudarte.</p>
          <a className="button" href={generalWhatsapp} target="_blank" rel="noreferrer">Hablemos por WhatsApp <MessageCircle size={18} /></a>
        </section>
      </main>

      <footer className="footer">
        <div><a className="brand brand--footer" href="#inicio"><span>MONTOYA</span><strong>DIGITAL BOND</strong></a><p>La chispa de la transformación digital.</p></div>
        <div className="footer__links"><a href={generalWhatsapp} target="_blank" rel="noreferrer">WhatsApp</a><a href={LINKEDIN} target="_blank" rel="noreferrer">LinkedIn</a></div>
        <p className="footer__copyright">© {new Date().getFullYear()} MONTOYADIGITALBOND.</p>
      </footer>

      <a className="whatsapp-float" href={generalWhatsapp} target="_blank" rel="noreferrer" aria-label="Hablar con Andrés por WhatsApp"><MessageCircle /><span>Hablemos</span></a>
    </div>
  );
}
