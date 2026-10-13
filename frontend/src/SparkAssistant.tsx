import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle, MessageCircle, RotateCcw, Send, Sparkles, X, Zap } from "lucide-react";

type ChatMessage = { role: "assistant" | "user"; content: string };
type Proposal = {
  problem: string;
  solution: string;
  tools: Array<{ name: string; purpose: string }>;
  scope: string[];
  assumptions: string[];
  investment: { status: "estimated" | "pending"; label: string | null; currency: "COP"; min: number | null; max: number | null };
  notice: string;
  thirdPartyNotice: string | null;
};
type ChatResponse = {
  mode: "live" | "demo";
  action: "ask" | "propose" | "message";
  message: string;
  questionCount: number;
  maxQuestions: number;
  sessionToken: string;
  proposal: Proposal | null;
};
type LeadResponse = { status: "interest_sent"; reference: string; notification: "sent"; whatsappUrl: string };

const INITIAL_MESSAGE = "¡Hola! Soy Spark ⚡ Cuéntame qué proceso te está quitando tiempo, qué problema quieres resolver o qué experiencia te gustaría mejorar.";

const formatCop = (value: number) => new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
}).format(value);

export default function SparkAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: INITIAL_MESSAGE }]);
  const [input, setInput] = useState("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [mode, setMode] = useState<"live" | "demo" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [showContact, setShowContact] = useState(false);
  const [contact, setContact] = useState({ name: "", company: "", whatsapp: "", email: "" });
  const [authorization, setAuthorization] = useState(false);
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [lead, setLead] = useState<LeadResponse | null>(null);
  const conversationEnd = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    conversationEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, proposal, loading, showContact, lead]);

  const sendMessage = async (message: string, retry = false) => {
    const cleanMessage = message.trim();
    if (!cleanMessage || loading || proposal) return;
    setLoading(true);
    setError(null);
    if (!retry) {
      setMessages((current) => [...current, { role: "user", content: cleanMessage }]);
      setInput("");
    }
    setRetryMessage(cleanMessage);
    try {
      const response = await fetch("/api/spark/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: cleanMessage, sessionToken }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Spark no pudo responder.");
      const result = data as ChatResponse;
      setSessionToken(result.sessionToken);
      setQuestionCount(result.questionCount);
      setMode(result.mode);
      setMessages((current) => [...current, { role: "assistant", content: result.message }]);
      setProposal(result.proposal);
      setRetryMessage(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Spark no pudo responder.");
    } finally {
      setLoading(false);
    }
  };

  const submitMessage = (event: FormEvent) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const submitLead = async (event: FormEvent) => {
    event.preventDefault();
    if (!sessionToken || !authorization || leadLoading) return;
    setLeadLoading(true);
    setLeadError(null);
    try {
      const response = await fetch("/api/spark/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, contact, authorization }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No fue posible registrar tu interés.");
      setLead(data as LeadResponse);
    } catch (requestError) {
      setLeadError(requestError instanceof Error ? requestError.message : "No fue posible registrar tu interés.");
    } finally {
      setLeadLoading(false);
    }
  };

  const resetConversation = () => {
    setMessages([{ role: "assistant", content: INITIAL_MESSAGE }]);
    setInput("");
    setSessionToken(null);
    setQuestionCount(0);
    setProposal(null);
    setMode(null);
    setError(null);
    setRetryMessage(null);
    setShowContact(false);
    setAuthorization(false);
    setLead(null);
    setLeadError(null);
  };

  return (
    <>
      <section className="spark-section section" id="spark" aria-labelledby="spark-title">
        <div className="spark-section__orb" aria-hidden="true"><Zap /></div>
        <div className="spark-section__copy">
          <p className="eyebrow">Orientación inteligente</p>
          <h2 id="spark-title">Soy Spark. Atrévete a ponerme a prueba. <span aria-hidden="true">⚡</span></h2>
          <p>Andrés convirtió parte de su experiencia en instrucciones para este asistente con inteligencia artificial. Cuéntame qué quieres mejorar y, con hasta tres preguntas, te propondré una solución inicial con herramientas e inversión estimada.</p>
          <button className="button" type="button" onClick={() => setOpen(true)}>Tengo un reto para Spark <ArrowRight size={18} /></button>
          <small><Sparkles size={15} /> Orientación inicial con IA. Alcance y valores pendientes de confirmación por Andrés.</small>
        </div>
      </section>

      <button className="spark-float" type="button" onClick={() => setOpen(true)} aria-label="Abrir asistente Spark">
        <Zap /><span>Probar Spark</span>
      </button>

      {open && (
        <div className="spark-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section className="spark-assistant" role="dialog" aria-modal="true" aria-labelledby="spark-dialog-title">
            <header className="spark-assistant__header">
              <div><span className="spark-assistant__mark"><Zap /></span><div><strong id="spark-dialog-title">Spark</strong><small>Orientación inicial con IA</small></div></div>
              <div className="spark-assistant__header-actions">
                <button type="button" onClick={resetConversation} aria-label="Iniciar una nueva conversación"><RotateCcw /></button>
                <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar Spark"><X /></button>
              </div>
            </header>

            {mode === "demo" && <p className="spark-demo" role="status">Modo demostración: no usa OpenAI ni permite registrar prospectos.</p>}

            <div className="spark-conversation" aria-live="polite">
              {messages.map((message, index) => <div className={`spark-message spark-message--${message.role}`} key={`${message.role}-${index}`}>{message.content}</div>)}
              {loading && <div className="spark-message spark-message--assistant spark-message--loading"><LoaderCircle className="spin" /> Spark está pensando…</div>}

              {error && (
                <div className="spark-error" role="alert">
                  <p>{error}</p>
                  <div>{retryMessage && <button type="button" onClick={() => void sendMessage(retryMessage, true)}>Reintentar</button>}<a href="https://wa.me/573042206989" target="_blank" rel="noreferrer">Hablar con Andrés</a></div>
                </div>
              )}

              {proposal && <ProposalCard proposal={proposal} onInterest={() => setShowContact(true)} />}

              {showContact && proposal && !lead && (
                <form className="spark-contact" onSubmit={submitLead}>
                  <div><p className="eyebrow eyebrow--dark">Interés registrado, no cotización</p><h3>Comparte tus datos con Andrés</h3></div>
                  <label>Nombre <span>*</span><input required maxLength={100} value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} autoComplete="name" /></label>
                  <label>Empresa <small>Opcional</small><input maxLength={120} value={contact.company} onChange={(event) => setContact({ ...contact, company: event.target.value })} autoComplete="organization" /></label>
                  <div className="spark-contact__pair">
                    <label>WhatsApp<input maxLength={40} value={contact.whatsapp} onChange={(event) => setContact({ ...contact, whatsapp: event.target.value })} autoComplete="tel" inputMode="tel" /></label>
                    <label>Correo<input maxLength={160} value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} autoComplete="email" inputMode="email" /></label>
                  </div>
                  <p className="spark-contact__hint">Escribe al menos WhatsApp o correo.</p>
                  <label className="spark-consent"><input type="checkbox" checked={authorization} onChange={(event) => setAuthorization(event.target.checked)} required /><span>Autorizo compartir mis datos y esta conversación con Andrés para revisar mi solicitud y contactarme.</span></label>
                  {leadError && <p className="spark-contact__error" role="alert">{leadError}</p>}
                  <button className="button button--dark" type="submit" disabled={leadLoading || !authorization || (!contact.whatsapp.trim() && !contact.email.trim())}>{leadLoading ? <><LoaderCircle className="spin" /> Registrando…</> : "Registrar mi interés"}</button>
                </form>
              )}

              {lead && (
                <div className="spark-success" role="status">
                  <Sparkles />
                  <h3>Interés registrado</h3>
                  <p>Referencia <strong>{lead.reference}</strong>. La notificación fue enviada.</p>
                  <a className="button button--dark" href={lead.whatsappUrl} target="_blank" rel="noreferrer">Continuar en WhatsApp <MessageCircle size={18} /></a>
                  <small>WhatsApp se abrirá con un mensaje preparado; tú decides si lo envías.</small>
                </div>
              )}
              <div ref={conversationEnd} />
            </div>

            {!proposal && (
              <form className="spark-composer" onSubmit={submitMessage}>
                <label className="sr-only" htmlFor="spark-message">Mensaje para Spark</label>
                <textarea id="spark-message" value={input} onChange={(event) => setInput(event.target.value)} maxLength={1500} rows={2} placeholder="Cuéntame tu reto…" disabled={loading} />
                <button type="submit" disabled={loading || !input.trim()} aria-label="Enviar mensaje"><Send /></button>
                <small>{questionCount}/3 preguntas de aclaración · {input.length}/1500</small>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function ProposalCard({ proposal, onInterest }: { proposal: Proposal; onInterest: () => void }) {
  return (
    <article className="spark-proposal">
      <div className="spark-proposal__heading"><span><Zap /></span><div><p>Propuesta preliminar</p><h3>Un primer camino para tu reto</h3></div></div>
      <dl>
        <div><dt>Problema identificado</dt><dd>{proposal.problem}</dd></div>
        <div><dt>Solución recomendada</dt><dd>{proposal.solution}</dd></div>
      </dl>
      {proposal.tools.length > 0 && <div className="spark-proposal__group"><h4>Herramientas sugeridas</h4><ul>{proposal.tools.map((tool) => <li key={`${tool.name}-${tool.purpose}`}><strong>{tool.name}</strong><span>{tool.purpose}</span></li>)}</ul></div>}
      <div className="spark-proposal__columns">
        <div><h4>Alcance inicial</h4><ul>{proposal.scope.map((item) => <li key={item}>{item}</li>)}</ul></div>
        <div><h4>Supuestos por validar</h4><ul>{proposal.assumptions.map((item) => <li key={item}>{item}</li>)}</ul></div>
      </div>
      <div className="spark-investment">
        <span>Inversión total estimada</span>
        <strong>{proposal.investment.status === "estimated" && proposal.investment.min !== null && proposal.investment.max !== null ? `${formatCop(proposal.investment.min)} – ${formatCop(proposal.investment.max)}` : proposal.investment.label}</strong>
        <small>{proposal.notice}</small>
        {proposal.thirdPartyNotice && <small>{proposal.thirdPartyNotice}</small>}
      </div>
      <button className="button button--dark" type="button" onClick={onInterest}>Me interesa, hablar con Andrés <ArrowRight size={18} /></button>
    </article>
  );
}
