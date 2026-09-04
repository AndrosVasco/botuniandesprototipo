import "dotenv/config";
import cors from "cors";
import express from "express";
import { handleChat } from "./agent/agentController.js";
import { resetSession, restoreSession } from "./memory/sessionStore.js";
import type { Language, SimulationControls } from "./types/domain.js";
import { allowAttempt, authConfigured, bearer, issueToken, validateCode, verifyToken } from "./auth/accessAuth.js";
import { sendInternalFeedback } from "./email/emailService.js";
import { randomUUID } from "node:crypto";
const app = express();
const port = Number(process.env.PORT ?? 3001);
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "1mb" }));
app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "asistente-aspirantes",
    frontend: "http://localhost:5173",
    endpoints: ["GET /api/health", "POST /api/chat"]
  });
});

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "asistente-aspirantes" }));
app.post("/api/access/unlock", (req, res) => {
  if (!authConfigured()) return res.status(503).json({ error: "Acceso temporal no configurado." });
  const key = req.ip ?? "unknown";
  if (!allowAttempt(`app:${key}`)) return res.status(429).json({ error: "Demasiados intentos. Espera un minuto." });
  if (typeof req.body?.code !== "string" || !validateCode("app", req.body.code)) return res.status(401).json({ error: "Código incorrecto." });
  return res.json(issueToken(false));
});
app.post("/api/access/unlock-ai", (req, res) => {
  const claims = verifyToken(bearer(req.headers.authorization));
  if (!claims) return res.status(401).json({ error: "La sesión expiró." });
  const key = req.ip ?? "unknown";
  if (!allowAttempt(`ai:${key}`)) return res.status(429).json({ error: "Demasiados intentos. Espera un minuto." });
  if (typeof req.body?.code !== "string" || !validateCode("ai", req.body.code)) return res.status(401).json({ error: "Código incorrecto." });
  return res.json(issueToken(true, claims.exp));
});
app.post("/api/chat", async (req, res) => {
  try {
    const { sessionId, message, mode, language, simulation, context, history } = req.body ?? {};
    if (!sessionId || typeof sessionId !== "string") return res.status(400).json({ error: "sessionId es requerido." });
    if (!message || typeof message !== "string") return res.status(400).json({ error: "message es requerido." });
    const claims = verifyToken(bearer(req.headers.authorization));
    if (!claims) return res.status(401).json({ error: "La sesión expiró." });
    if (mode === "ai" && !claims.ai) return res.status(403).json({ error: "El modo IA requiere autorización." });
    const safeLanguage: Language = language === "en" || language === "pt" ? language : "es";
    const safeSimulation: SimulationControls = {
      advisorOnline: simulation?.advisorOnline !== false,
      cohortOpen: simulation?.cohortOpen !== false,
      aiError: simulation?.aiError === true
    };
    restoreSession(sessionId, safeLanguage, context, history);
    res.json(await handleChat(sessionId, message.trim(), mode === "ai" ? "ai" : "demo", safeLanguage, safeSimulation));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "No fue posible procesar el mensaje. Inténtalo de nuevo." });
  }
});
app.post("/api/session/reset", (req, res) => {
  const { sessionId, language } = req.body ?? {};
  if (typeof sessionId !== "string" || !sessionId) return res.status(400).json({ error: "sessionId es requerido." });
  if (!verifyToken(bearer(req.headers.authorization))) return res.status(401).json({ error: "La sesión expiró." });
  resetSession(sessionId, language === "en" || language === "pt" ? language : "es");
  return res.json({ ok: true });
});
app.post("/api/feedback", async (req, res) => {
  const claims = verifyToken(bearer(req.headers.authorization));
  if (!claims) return res.status(401).json({ error: "La sesión expiró." });
  const { sessionId, rating, detail = "" } = req.body ?? {};
  if (typeof sessionId !== "string" || !sessionId || !Number.isInteger(rating) || rating < 1 || rating > 5 || typeof detail !== "string" || detail.length > 2000) {
    return res.status(400).json({ error: "Selecciona una calificación entre 1 y 5 estrellas." });
  }
  const reference = `AYUDA-${randomUUID().slice(0, 8).toUpperCase()}`;
  const delivery = await sendInternalFeedback(reference, sessionId.slice(0, 100), rating, detail.trim()).catch((error) => {
    console.error("No fue posible enviar el comentario", error);
    return { ok: false as const, reason: "delivery_failed" };
  });
  if (!delivery.ok) return res.status(503).json({ error: "No fue posible enviar la calificación. Inténtalo nuevamente." });
  return res.status(202).json({ ok: true, reference, delivered: true });
});
// Vercel administra el ciclo de vida HTTP. En local conservamos el servidor tradicional.
if (!process.env.VERCEL) app.listen(port, () => console.log(`Backend listo en http://localhost:${port}`));

export = app;


