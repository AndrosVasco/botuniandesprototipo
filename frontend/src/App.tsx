import { FormEvent, useState } from "react";
import { CircleHelp, GraduationCap, LockKeyhole } from "lucide-react";
import { ChatWidget } from "./components/ChatWidget";
import { EnrollmentForm } from "./components/EnrollmentForm";
import { HelpVideoModal } from "./components/HelpVideoModal";
import { unlockApplication, type AccessSession } from "./services/chatApi";
import "./styles.css";

export default function App() {
  if (window.location.pathname.replace(/\/$/, "") === "/formulario-inscripcion") return <EnrollmentForm />;
  const [session, setSession] = useState<AccessSession | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [code, setCode] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try { setSession(await unlockApplication(code)); setCode(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No fue posible validar el acceso."); }
    finally { setLoading(false); }
  }
  if (session) return <ChatWidget access={session} onAccessChange={setSession} onExpired={() => setSession(null)} />;
  return <main className="access-shell"><section className="access-card"><button className="help-trigger help-trigger--access" type="button" onClick={() => setShowHelp(true)} aria-label="Ver guía de uso" title="Ver guía de uso"><CircleHelp size={21} /></button><div className="access-icon"><GraduationCap size={26} /></div><span className="access-kicker">Prototipo técnico</span><h1>Asistente de Aspirantes</h1><p>Ingresa el código de acceso para continuar. La sesión se cerrará automáticamente después de cinco minutos.</p><form onSubmit={submit}><label htmlFor="access-code">Código de acceso</label><div className="access-input"><LockKeyhole size={18} /><input id="access-code" type="password" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" required autoFocus /></div>{error && <div className="access-error">{error}</div>}<button type="submit" disabled={loading || code.length < 8}>{loading ? "Validando..." : "Ingresar"}</button></form></section>{showHelp && <HelpVideoModal onClose={() => setShowHelp(false)} />}</main>;
}
