import "dotenv/config";
import cors from "cors";
import express from "express";
import { handleChat } from "./agent/agentController.js";
import { resetSession } from "./memory/sessionStore.js";
import type { Language } from "./types/domain.js";
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
app.post("/api/chat", async (req, res) => {
  try {
    const { sessionId, message, mode, language } = req.body ?? {};
    if (!sessionId || typeof sessionId !== "string") return res.status(400).json({ error: "sessionId es requerido." });
    if (!message || typeof message !== "string") return res.status(400).json({ error: "message es requerido." });
    const safeLanguage: Language = language === "en" || language === "pt" ? language : "es";
    res.json(await handleChat(sessionId, message.trim(), mode === "ai" ? "ai" : "demo", safeLanguage));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "No fue posible procesar el mensaje. Inténtalo de nuevo." });
  }
});
app.post("/api/session/reset", (req, res) => {
  const { sessionId, language } = req.body ?? {};
  if (typeof sessionId !== "string" || !sessionId) return res.status(400).json({ error: "sessionId es requerido." });
  resetSession(sessionId, language === "en" || language === "pt" ? language : "es");
  return res.json({ ok: true });
});
app.listen(port, () => console.log(`Backend listo en http://localhost:${port}`));


