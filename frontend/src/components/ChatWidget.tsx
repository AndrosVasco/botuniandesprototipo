import { FormEvent, useEffect, useRef, useState } from "react";
import { GraduationCap, MessageCircle, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { AccessExpiredError, resetChatSession, sendChatMessage, sendFeedback, unlockAi, type AccessSession, type ChatMode, type SimulationControls } from "../services/chatApi";
import { MessageBubble } from "./MessageBubble";
import type { ChatMessage, Language } from "./types";

const content = {
  es: { subtitle: "Información sobre programas y admisiones", prototype: "Prototipo técnico · Información simulada", welcome: "Hola. Puedo orientarte sobre programas, cohortes y procesos de admisión.", prompts: ["Quiero consultar un programa y sus fechas.", "Quiero saber si hay una cohorte disponible.", "Quiero hablar con Admisiones."], placeholder: "Escribe tu mensaje...", loading: "Consultando...", reset: "Reiniciar conversación", advisor: "Admisiones", cohort: "Cohorte", engine: "Conexión IA", online: "Online", offline: "Offline", available: "Disponible", unavailable: "No disponible", connected: "Conectada", error: "Simular error", retry: "Reintentar IA" },
  en: { subtitle: "Information about programs and admissions", prototype: "Technical prototype · Simulated information", welcome: "Hello. I can guide you through programs, cohorts, and admissions processes.", prompts: ["I want to check a program and its dates.", "I want to know whether a cohort is available.", "I want to talk to Admissions."], placeholder: "Type your message...", loading: "Checking...", reset: "Restart conversation", advisor: "Admissions", cohort: "Cohort", engine: "AI connection", online: "Online", offline: "Offline", available: "Available", unavailable: "Unavailable", connected: "Connected", error: "Simulate error", retry: "Retry AI" },
  pt: { subtitle: "Informações sobre programas e admissões", prototype: "Protótipo técnico · Informações simuladas", welcome: "Olá. Posso orientar sobre cursos, turmas e processos de admissão.", prompts: ["Quero consultar um programa e suas datas.", "Quero saber se há uma turma disponível.", "Quero falar com Admissões."], placeholder: "Digite sua mensagem...", loading: "Consultando...", reset: "Reiniciar conversa", advisor: "Admissões", cohort: "Turma", engine: "Conexão IA", online: "Online", offline: "Offline", available: "Disponível", unavailable: "Indisponível", connected: "Conectada", error: "Simular erro", retry: "Tentar IA novamente" }
} as const;
const ENROLLMENT_URL = import.meta.env.PROD ? "https://botuniandesprototipo-frontend.vercel.app/formulario-inscripcion" : "/formulario-inscripcion";

export function ChatWidget({ access, onAccessChange, onExpired }: { access: AccessSession; onAccessChange: (session: AccessSession) => void; onExpired: () => void }) {
  const [sessionId, setSessionId] = useState(() => `aspirantes-${crypto.randomUUID()}`);
  const [language, setLanguage] = useState<Language>("es");
  const [mode, setMode] = useState<ChatMode>("demo");
  const [advisorOnline, setAdvisorOnline] = useState(true);
  const [cohortOpen, setCohortOpen] = useState(true);
  const [aiError, setAiError] = useState(false);
  const [showAiUnlock, setShowAiUnlock] = useState(false);
  const [aiCode, setAiCode] = useState("");
  const [aiUnlockError, setAiUnlockError] = useState("");
  const [unlockingAi, setUnlockingAi] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: "welcome", role: "assistant", content: content.es.welcome }]);
  const [conversationContext, setConversationContext] = useState<Record<string, unknown> | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [failure, setFailure] = useState<{ expired: boolean } | null>(null);
  const lastAttemptRef = useRef("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const t = content[language];

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, isLoading]);
  useEffect(() => {
    const remaining = access.expiresAt - Date.now();
    if (remaining <= 0) { setFailure({ expired: true }); return; }
    const timer = window.setTimeout(() => setFailure({ expired: true }), remaining);
    return () => window.clearTimeout(timer);
  }, [access.expiresAt]);

  async function submit(text = input, override: Partial<SimulationControls> = {}) {
    if (text === "__open_enrollment_form__") { window.location.assign(ENROLLMENT_URL); return; }
    if (text === "__feedback__") { setFeedbackStatus(""); setShowFeedback(true); return; }
    if (text === "__alt_contacts__") {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: language === "en" ? "Alternative demo channels:\n\nPhone: **+57 601 555 0100**\nEmail: **admisiones@demo.invalid**\nHours: Monday to Friday, 8:00 a.m. to 5:00 p.m." : language === "pt" ? "Canais alternativos de demonstração:\n\nTelefone: **+57 601 555 0100**\nE-mail: **admisiones@demo.invalid**\nHorário: segunda a sexta, das 8h às 17h." : "Canales alternos de demostración:\n\nTeléfono: **+57 601 555 0100**\nCorreo: **admisiones@demo.invalid**\nHorario: lunes a viernes, de 8:00 a. m. a 5:00 p. m.", ui: { type: "actions", actions: [{ label: language === "en" ? "Request an advisor" : language === "pt" ? "Solicitar assessor" : "Solicitar un asesor", message: language === "en" ? "Contact Admissions" : language === "pt" ? "Contatar Admissões" : "Contactar a Admisiones", variant: "primary" }] } }]);
      return;
    }
    if (text === "__retry_last__") text = lastAttemptRef.current || t.prompts[0];
    const retry = text === "__retry_ai__";
    const clean = retry ? t.retry : text.trim();
    if (!clean || isLoading) return;
    lastAttemptRef.current = clean;
    if (retry) setAiError(false);
    const simulation: SimulationControls = { advisorOnline, cohortOpen, aiError, ...override, ...(retry ? { aiError: false } : {}) };
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", content: clean }]);
    setInput(""); setError(null); setIsLoading(true);
    try {
      const history = messages.slice(-10).map(({ role, content }) => ({ role, content }));
      const response = await sendChatMessage(sessionId, clean, mode, language, simulation, access.token, conversationContext, history);
      if (response.toolUsed === "simulated_ai_disconnect" || response.toolUsed === "ai_provider_unavailable") {
        setFailure({ expired: false });
        return;
      }
      setConversationContext(response.memory);
      setMessages((current) => {
        const previousUser = [...current].reverse().find((item) => item.role === "user");
        const previousAssistant = [...current].reverse().find((item) => item.role === "assistant");
        const normalize = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
        const loopDetected = previousUser && previousAssistant && normalize(previousUser.content) === normalize(clean) && normalize(previousAssistant.content) === normalize(response.reply);
        if (loopDetected) return [...current, recoveryMessage(language, true)];
        return [...current, { id: crypto.randomUUID(), role: "assistant", content: response.reply, toolUsed: response.toolUsed, ui: mode === "ai" ? withAdvisorAction(response.ui, language, response.toolUsed) : response.ui }];
      });
    } catch (reason) {
      setFailure({ expired: reason instanceof AccessExpiredError });
    } finally { setIsLoading(false); }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void submit(); }
  function changeLanguage(next: Language) { setLanguage(next); setMessages([{ id: crypto.randomUUID(), role: "assistant", content: content[next].welcome }]); setConversationContext(null); setSessionId(`aspirantes-${crypto.randomUUID()}`); setError(null); }
  async function reset(nextMode: ChatMode = mode, showPrediction = false) { await resetChatSession(sessionId, language, access.token); setSessionId(`aspirantes-${crypto.randomUUID()}`); setMode(nextMode); setMessages([{ id: crypto.randomUUID(), role: "assistant", content: t.welcome }, ...(showPrediction ? [predictiveMessage(language)] : [])]); setConversationContext(null); setError(null); setFailure(null); setInput(""); lastAttemptRef.current = ""; }
  function selectAiMode() { if (mode === "ai") return; if (aiEnabled) void reset("ai", true); else { setAiUnlockError(""); setAiCode(""); setShowAiUnlock(true); } }
  function selectDemoMode() { if (mode !== "demo") void reset("demo"); }
  async function authorizeAi(event: FormEvent) {
    event.preventDefault(); setUnlockingAi(true); setAiUnlockError("");
    try { const next = await unlockAi(aiCode, access.token); onAccessChange(next); setAiEnabled(true); setShowAiUnlock(false); setAiCode(""); await reset("ai", true); }
    catch (reason) { if (reason instanceof AccessExpiredError) setFailure({ expired: true }); else setAiUnlockError("No fue posible habilitar IA. Verifica el código e inténtalo nuevamente."); }
    finally { setUnlockingAi(false); }
  }
  async function submitFeedback(event: FormEvent) {
    event.preventDefault(); setSendingFeedback(true); setFeedbackStatus("");
    try {
      const result = await sendFeedback(sessionId, feedback, access.token);
      setFeedbackStatus(language === "en" ? `Thank you. We received your comment (${result.reference}).` : language === "pt" ? `Obrigado. Recebemos seu comentário (${result.reference}).` : `Gracias. Recibimos tu comentario (${result.reference}).`);
      setFeedback("");
    } catch (reason) {
      if (reason instanceof AccessExpiredError) onExpired();
      else setFeedbackStatus(language === "en" ? "We could not send it. Please try again." : language === "pt" ? "Não foi possível enviar. Tente novamente." : "No pudimos enviarlo. Inténtalo nuevamente.");
    } finally { setSendingFeedback(false); }
  }

  return (
    <main className="page-shell"><section className="chat-widget" aria-label="Asistente de Aspirantes">
      <header className="chat-header">
        <div className="chat-header__icon"><GraduationCap size={24} /></div>
        <div className="chat-header__copy"><h1>Asistente de Aspirantes</h1><p>{t.subtitle}</p><small>{t.prototype}</small></div>
        <div className="header-actions">
          <div className="language-switch" aria-label="Idioma">{(["es", "en", "pt"] as Language[]).map((item) => <button key={item} type="button" className={language === item ? "is-active" : ""} onClick={() => changeLanguage(item)} disabled={isLoading}>{item.toUpperCase()}</button>)}</div>
          <div className="mode-switch" aria-label="Modo de respuesta"><button type="button" className={mode === "demo" ? "is-active" : ""} onClick={selectDemoMode} disabled={isLoading}>Demo</button><button type="button" className={mode === "ai" ? "is-active" : ""} onClick={selectAiMode} disabled={isLoading}>IA</button></div>
          <span className={`status ${mode === "ai" && aiError ? "is-error" : ""}`}>{mode === "ai" && aiError ? "IA offline" : "Online"}</span>
        </div>
      </header>
      <div className={`simulation-controls ${mode !== "ai" ? "is-hidden" : ""}`} aria-label="Controles de simulación IA">
        <Control label={t.advisor} active={advisorOnline} activeLabel={t.online} inactiveLabel={t.offline} onChange={setAdvisorOnline} disabled={isLoading} />
        <Control label={t.cohort} active={cohortOpen} activeLabel={t.available} inactiveLabel={t.unavailable} onChange={setCohortOpen} disabled={isLoading} />
        <Control label={t.engine} active={!aiError} activeLabel={t.connected} inactiveLabel={t.error} onChange={(connected) => setAiError(!connected)} disabled={isLoading} danger />
      </div>
      <div className={`toolbar ${mode === "ai" ? "toolbar--ai" : ""}`}>{mode === "demo" && <div className="quick-prompts" aria-label="Escenarios demo">{t.prompts.map((prompt) => <button key={prompt} type="button" onClick={() => void submit(prompt)} disabled={isLoading}><Sparkles size={14} />{prompt}</button>)}</div>}<button className="reset-button" type="button" onClick={() => void reset()} disabled={isLoading} title={t.reset}><RotateCcw size={16} /><span>{t.reset}</span></button></div>
      <div className="messages" role="log" aria-live="polite">{messages.map((message) => <MessageBubble key={message.id} message={message} language={language} onAction={(value) => void submit(value)} />)}{isLoading && <div className="typing">{t.loading}</div>}<div ref={messagesEndRef} aria-hidden="true" /></div>
      {error && <div className="error">{error}</div>}
      <form className="composer" onSubmit={onSubmit}><button className="feedback-trigger" type="button" onClick={() => { setFeedbackStatus(""); setShowFeedback(true); }} title="Ayúdanos a mejorar" aria-label="Ayúdanos a mejorar"><MessageCircle size={17} /></button><input value={input} onChange={(event) => setInput(event.target.value)} placeholder={t.placeholder} aria-label={t.placeholder} /><button className="send-button" type="submit" disabled={isLoading || !input.trim()} aria-label="Enviar"><Send size={18} /></button></form>
      {showAiUnlock && <div className="unlock-overlay" role="dialog" aria-modal="true" aria-labelledby="ai-unlock-title"><form className="unlock-card" onSubmit={authorizeAi}><h2 id="ai-unlock-title">Habilitar modo IA</h2><p>Ingresa el código adicional para utilizar la inteligencia artificial durante esta sesión.</p><label htmlFor="ai-code">Código de IA</label><input id="ai-code" type="password" value={aiCode} onChange={(event) => setAiCode(event.target.value)} autoComplete="off" required autoFocus />{aiUnlockError && <div className="access-error">{aiUnlockError}</div>}<div className="unlock-actions"><button type="button" onClick={() => setShowAiUnlock(false)}>Cancelar</button><button className="primary" type="submit" disabled={unlockingAi || aiCode.length < 8}>{unlockingAi ? "Validando..." : "Habilitar IA"}</button></div></form></div>}
      {showFeedback && <div className="unlock-overlay" role="dialog" aria-modal="true" aria-labelledby="feedback-title"><form className="unlock-card feedback-card" onSubmit={submitFeedback}><button className="dialog-close" type="button" onClick={() => setShowFeedback(false)} aria-label="Cerrar"><X size={18} /></button><h2 id="feedback-title">Ayúdanos a mejorar</h2><p>Cuéntanos brevemente qué ocurrió. Enviaremos tu comentario al equipo; no incluyas datos sensibles.</p><label htmlFor="feedback-detail">Tu comentario</label><textarea id="feedback-detail" value={feedback} onChange={(event) => setFeedback(event.target.value)} maxLength={2000} rows={4} required autoFocus />{feedbackStatus && <div className="feedback-status" role="status">{feedbackStatus}</div>}<div className="unlock-actions"><button type="button" onClick={() => setShowFeedback(false)}>Cerrar</button><button className="primary" type="submit" disabled={sendingFeedback || feedback.trim().length < 3}>{sendingFeedback ? "Enviando..." : "Enviar comentario"}</button></div></form></div>}
      {failure && <div className="unlock-overlay" role="alertdialog" aria-modal="true" aria-labelledby="failure-title"><section className="unlock-card failure-card"><h2 id="failure-title">{failure.expired ? "Tu sesión finalizó" : "Hagamos una pausa"}</h2><p>{failure.expired ? "Por seguridad, el tiempo de acceso terminó. Vuelve a ingresar para continuar; tu solicitud no fue enviada." : "Lo sentimos, no pudimos completar esta respuesta. No mostraremos detalles técnicos, pero puedes intentarlo nuevamente o continuar con un asesor."}</p><div className="unlock-actions">{!failure.expired && <><button type="button" onClick={() => { setFailure(null); void submit("__alt_contacts__"); }}>Otros canales</button><button type="button" onClick={() => { setFailure(null); void reset("demo"); }}>Continuar en Demo</button><button className="primary" type="button" onClick={() => { setFailure(null); void submit("__retry_last__"); }}>Intentar nuevamente</button></>}{failure.expired && <button className="primary" type="button" onClick={onExpired}>Volver a ingresar</button>}</div></section></div>}
    </section></main>
  );
}

function withAdvisorAction(ui: ChatMessage["ui"], language: Language, toolUsed: string | null): ChatMessage["ui"] {
  if (toolUsed === "checkAdvisorAvailability") return ui;
  const action = { label: language === "en" ? "Talk to an advisor" : language === "pt" ? "Falar com um assessor" : "Hablar con un asesor", message: language === "en" ? "I want to talk to Admissions" : language === "pt" ? "Quero falar com Admissões" : "Quiero hablar con Admisiones" };
  if (!ui) return { type: "actions", actions: [action] };
  if (ui.actions.some((item) => /advisor|asesor|assessor|admisiones|admissions|admissões/i.test(`${item.label} ${item.message}`))) return ui;
  return { ...ui, actions: [...ui.actions, action] };
}

function recoveryMessage(language: Language, loop: boolean): ChatMessage {
  const content = language === "en" ? `Sorry, ${loop ? "it looks like I repeated myself" : "I couldn't complete that request"}. We can try once more or continue through an alternative channel.` : language === "pt" ? `Desculpe, ${loop ? "parece que repeti a mesma resposta" : "não consegui concluir a solicitação"}. Podemos tentar mais uma vez ou continuar por outro canal.` : `Lo siento, ${loop ? "parece que repetí la misma respuesta" : "no pude completar la solicitud"}. Podemos intentarlo una vez más o continuar por otro canal.`;
  return { id: crypto.randomUUID(), role: "assistant", content, ui: { type: "actions", actions: [{ label: language === "en" ? "Try once more" : language === "pt" ? "Tentar mais uma vez" : "Intentar una vez más", message: "__retry_last__", variant: "primary" }, { label: language === "en" ? "Other channels" : language === "pt" ? "Outros canais" : "Otros canales", message: "__alt_contacts__" }, { label: language === "en" ? "Help us improve" : language === "pt" ? "Ajude-nos a melhorar" : "Ayúdanos a mejorar", message: "__feedback__" }] } };
}

function predictiveMessage(language: Language): ChatMessage {
  const content = language === "en" ? "**A possible next step**\n\nOur prototype's predictive model found simulated prior activity in which you searched for information about **Medicine**. Shall we make one last effort? I can connect you with an Admissions advisor." : language === "pt" ? "**Um possível próximo passo**\n\nO modelo preditivo do protótipo encontrou atividade anterior simulada em que você buscou informações sobre **Medicina**. Vamos fazer uma última tentativa? Posso encaminhar você a um assessor de Admissões." : "**Un posible siguiente paso**\n\nEl modelo predictivo del prototipo encontró actividad anterior simulada en la que buscaste información sobre **Medicina**. ¿Hacemos un último esfuerzo? Puedo conectarte con un asesor de Admisiones.";
  return { id: crypto.randomUUID(), role: "assistant", content, ui: { type: "actions", actions: [{ label: language === "en" ? "Contact an advisor" : language === "pt" ? "Contatar um assessor" : "Contactar a un asesor", message: language === "en" ? "Contact Admissions about Medicine" : language === "pt" ? "Contatar Admissões sobre Medicina" : "Contactar a Admisiones sobre Medicina", variant: "primary" }, { label: language === "en" ? "View Medicine" : language === "pt" ? "Ver Medicina" : "Ver Medicina", message: language === "en" ? "I want to study Medicine" : language === "pt" ? "Quero estudar Medicina" : "Quiero estudiar Medicina" }] } };
}

function Control({ label, active, activeLabel, inactiveLabel, onChange, disabled, danger = false }: { label: string; active: boolean; activeLabel: string; inactiveLabel: string; onChange: (value: boolean) => void; disabled: boolean; danger?: boolean }) {
  return <div className="simulation-control"><span>{label}</span><div className={`binary-switch ${danger && !active ? "is-danger" : ""}`}><button type="button" className={active ? "is-active" : ""} onClick={() => onChange(true)} disabled={disabled}>{activeLabel}</button><button type="button" className={!active ? "is-active" : ""} onClick={() => onChange(false)} disabled={disabled}>{inactiveLabel}</button></div></div>;
}
