import { FormEvent, useEffect, useRef, useState } from "react";
import { GraduationCap, RotateCcw, Send, Sparkles } from "lucide-react";
import { AccessExpiredError, resetChatSession, sendChatMessage, unlockAi, type AccessSession, type ChatMode, type SimulationControls } from "../services/chatApi";
import { MessageBubble } from "./MessageBubble";
import type { ChatMessage, Language } from "./types";

const content = {
  es: { subtitle: "Información sobre programas y admisiones", prototype: "Prototipo técnico · Información simulada", welcome: "Hola. Puedo orientarte con información simulada sobre programas y admisiones.", prompts: ["Quiero consultar un programa y sus fechas.", "Quiero saber si hay una cohorte disponible.", "Quiero hablar con Admisiones."], placeholder: "Escribe tu mensaje...", loading: "Consultando...", reset: "Reiniciar conversación", advisor: "Admisiones", cohort: "Cohorte", engine: "Conexión IA", online: "Online", offline: "Offline", available: "Disponible", unavailable: "No disponible", connected: "Conectada", error: "Simular error", retry: "Reintentar IA" },
  en: { subtitle: "Information about programs and admissions", prototype: "Technical prototype · Simulated information", welcome: "Hello. I can guide you with simulated information about programs and admissions.", prompts: ["I want to check a program and its dates.", "I want to know whether a cohort is available.", "I want to talk to Admissions."], placeholder: "Type your message...", loading: "Checking...", reset: "Restart conversation", advisor: "Admissions", cohort: "Cohort", engine: "AI connection", online: "Online", offline: "Offline", available: "Available", unavailable: "Unavailable", connected: "Connected", error: "Simulate error", retry: "Retry AI" },
  pt: { subtitle: "Informações sobre programas e admissões", prototype: "Protótipo técnico · Informações simuladas", welcome: "Olá. Posso orientar com informações simuladas sobre programas e admissões.", prompts: ["Quero consultar um programa e suas datas.", "Quero saber se há uma turma disponível.", "Quero falar com Admissões."], placeholder: "Digite sua mensagem...", loading: "Consultando...", reset: "Reiniciar conversa", advisor: "Admissões", cohort: "Turma", engine: "Conexão IA", online: "Online", offline: "Offline", available: "Disponível", unavailable: "Indisponível", connected: "Conectada", error: "Simular erro", retry: "Tentar IA novamente" }
} as const;

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
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const t = content[language];

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, isLoading]);

  async function submit(text = input, override: Partial<SimulationControls> = {}) {
    const retry = text === "__retry_ai__";
    const clean = retry ? t.retry : text.trim();
    if (!clean || isLoading) return;
    if (retry) setAiError(false);
    const simulation: SimulationControls = { advisorOnline, cohortOpen, aiError, ...override, ...(retry ? { aiError: false } : {}) };
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", content: clean }]);
    setInput(""); setError(null); setIsLoading(true);
    try {
      const response = await sendChatMessage(sessionId, clean, mode, language, simulation, access.token);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: response.reply, toolUsed: response.toolUsed, ui: response.ui }]);
    } catch (reason) {
      if (reason instanceof AccessExpiredError) { onExpired(); return; }
      setError(language === "en" ? "The assistant is unavailable. Please try again." : language === "pt" ? "O assistente não está disponível. Tente novamente." : "El asistente no está disponible. Inténtalo de nuevo.");
    } finally { setIsLoading(false); }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void submit(); }
  function changeLanguage(next: Language) { setLanguage(next); setMessages([{ id: crypto.randomUUID(), role: "assistant", content: content[next].welcome }]); setSessionId(`aspirantes-${crypto.randomUUID()}`); setError(null); }
  async function reset() { await resetChatSession(sessionId, language, access.token); setSessionId(`aspirantes-${crypto.randomUUID()}`); setMessages([{ id: crypto.randomUUID(), role: "assistant", content: t.welcome }]); setError(null); setInput(""); }
  function selectAiMode() { if (aiEnabled) setMode("ai"); else { setAiUnlockError(""); setAiCode(""); setShowAiUnlock(true); } }
  async function authorizeAi(event: FormEvent) {
    event.preventDefault(); setUnlockingAi(true); setAiUnlockError("");
    try { const next = await unlockAi(aiCode, access.token); onAccessChange(next); setAiEnabled(true); setMode("ai"); setShowAiUnlock(false); setAiCode(""); }
    catch (reason) { if (reason instanceof AccessExpiredError) onExpired(); else setAiUnlockError(reason instanceof Error ? reason.message : "No fue posible habilitar IA."); }
    finally { setUnlockingAi(false); }
  }

  return (
    <main className="page-shell"><section className="chat-widget" aria-label="Asistente de Aspirantes">
      <header className="chat-header">
        <div className="chat-header__icon"><GraduationCap size={24} /></div>
        <div className="chat-header__copy"><h1>Asistente de Aspirantes</h1><p>{t.subtitle}</p><small>{t.prototype}</small></div>
        <div className="header-actions">
          <div className="language-switch" aria-label="Idioma">{(["es", "en", "pt"] as Language[]).map((item) => <button key={item} type="button" className={language === item ? "is-active" : ""} onClick={() => changeLanguage(item)} disabled={isLoading}>{item.toUpperCase()}</button>)}</div>
          <div className="mode-switch" aria-label="Modo de respuesta"><button type="button" className={mode === "demo" ? "is-active" : ""} onClick={() => setMode("demo")} disabled={isLoading}>Demo</button><button type="button" className={mode === "ai" ? "is-active" : ""} onClick={selectAiMode} disabled={isLoading}>IA</button></div>
          <span className={`status ${mode === "ai" && aiError ? "is-error" : ""}`}>{mode === "ai" && aiError ? "IA offline" : "Online"}</span>
        </div>
      </header>
      <div className={`simulation-controls ${mode !== "ai" ? "is-hidden" : ""}`} aria-label="Controles de simulación IA">
        <Control label={t.advisor} active={advisorOnline} activeLabel={t.online} inactiveLabel={t.offline} onChange={setAdvisorOnline} disabled={isLoading} />
        <Control label={t.cohort} active={cohortOpen} activeLabel={t.available} inactiveLabel={t.unavailable} onChange={setCohortOpen} disabled={isLoading} />
        <Control label={t.engine} active={!aiError} activeLabel={t.connected} inactiveLabel={t.error} onChange={(connected) => setAiError(!connected)} disabled={isLoading} danger />
      </div>
      <div className="toolbar"><div className="quick-prompts" aria-label="Escenarios demo">{t.prompts.map((prompt) => <button key={prompt} type="button" onClick={() => void submit(prompt)} disabled={isLoading}><Sparkles size={14} />{prompt}</button>)}</div><button className="reset-button" type="button" onClick={() => void reset()} disabled={isLoading} title={t.reset}><RotateCcw size={16} /><span>{t.reset}</span></button></div>
      <div className="messages" role="log" aria-live="polite">{messages.map((message) => <MessageBubble key={message.id} message={message} language={language} onAction={(value) => void submit(value)} />)}{isLoading && <div className="typing">{t.loading}</div>}<div ref={messagesEndRef} aria-hidden="true" /></div>
      {error && <div className="error">{error}</div>}
      <form className="composer" onSubmit={onSubmit}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder={t.placeholder} aria-label={t.placeholder} /><button type="submit" disabled={isLoading || !input.trim()} aria-label="Enviar"><Send size={18} /></button></form>
      {showAiUnlock && <div className="unlock-overlay" role="dialog" aria-modal="true" aria-labelledby="ai-unlock-title"><form className="unlock-card" onSubmit={authorizeAi}><h2 id="ai-unlock-title">Habilitar modo IA</h2><p>Ingresa el código adicional para utilizar la inteligencia artificial durante esta sesión.</p><label htmlFor="ai-code">Código de IA</label><input id="ai-code" type="password" value={aiCode} onChange={(event) => setAiCode(event.target.value)} autoComplete="off" required autoFocus />{aiUnlockError && <div className="access-error">{aiUnlockError}</div>}<div className="unlock-actions"><button type="button" onClick={() => setShowAiUnlock(false)}>Cancelar</button><button className="primary" type="submit" disabled={unlockingAi || aiCode.length < 8}>{unlockingAi ? "Validando..." : "Habilitar IA"}</button></div></form></div>}
    </section></main>
  );
}

function Control({ label, active, activeLabel, inactiveLabel, onChange, disabled, danger = false }: { label: string; active: boolean; activeLabel: string; inactiveLabel: string; onChange: (value: boolean) => void; disabled: boolean; danger?: boolean }) {
  return <div className="simulation-control"><span>{label}</span><div className={`binary-switch ${danger && !active ? "is-danger" : ""}`}><button type="button" className={active ? "is-active" : ""} onClick={() => onChange(true)} disabled={disabled}>{activeLabel}</button><button type="button" className={!active ? "is-active" : ""} onClick={() => onChange(false)} disabled={disabled}>{inactiveLabel}</button></div></div>;
}
