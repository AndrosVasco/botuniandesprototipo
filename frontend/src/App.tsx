import { FormEvent, useEffect, useState } from "react";
import { GraduationCap, LockKeyhole } from "lucide-react";
import { ChatWidget } from "./components/ChatWidget";
import { unlockApplication, type AccessSession } from "./services/chatApi";
import "./styles.css";

export default function App() {
  const [session, setSession] = useState<AccessSession | null>(null);
  const [code, setCode] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!session) return;
    const remaining = session.expiresAt - Date.now();
    if (remaining <= 0) { setSession(null); return; }
    const timer = window.setTimeout(() => setSession(null), remaining);
    return () => window.clearTimeout(timer);
  }, [session]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try { setSession(await unlockApplication(code)); setCode(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No fue posible validar el acceso."); }
    finally { setLoading(false); }
  }
  if (session) return <ChatWidget access={session} onAccessChange={setSession} onExpired={() => setSession(null)} />;
  return <main className="access-shell"><section className="access-card"><div className="access-icon"><GraduationCap size={26} /></div><span className="access-kicker">Prototipo técnico</span><h1>Asistente de Aspirantes</h1><p>Ingresa el código de acceso para continuar. La sesión se cerrará automáticamente después de cinco minutos.</p><form onSubmit={submit}><label htmlFor="access-code">Código de acceso</label><div className="access-input"><LockKeyhole size={18} /><input id="access-code" type="password" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" required autoFocus /></div>{error && <div className="access-error">{error}</div>}<button type="submit" disabled={loading || code.length < 8}>{loading ? "Validando..." : "Ingresar"}</button></form></section></main>;
}
