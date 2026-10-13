const crypto = require("node:crypto");
const {
  EFFORT_MATRIX,
  SERVICE_KEYS,
  PUBLIC_NOTICE,
  THIRD_PARTY_NOTICE,
} = require("./spark-config");

const MAX_QUESTIONS = 3;
const MAX_MESSAGE_LENGTH = 1500;
const MAX_SESSION_AGE_MS = 2 * 60 * 60 * 1000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 8;
const rateWindows = new Map();

const IN_SCOPE_PATTERN = /\b(atencion|clientes?|negocios?|empresas?|procesos?|operacion|ventas?|soporte|solicitudes?|tareas?|automat[a-z]*|chatbots?|bots?|whatsapp|zendesk|n8n|crm|apis?|integra[a-z]*|formularios?|datos?|equipos?|asesores?|canales?|seguimiento|flujos?|manual|repetitiv[a-z]*|productos?|servicios?|experiencia|paginas?|sitio web|aplicaciones?|apps?|herramientas?|transformacion digital|contabilidad|facturacion|cartera|inventario|nomina|compras|administracion|talento humano|recursos humanos|logistica|mentor[a-z]*|consultor[a-z]*)\b/i;
const INJECTION_PATTERN = /(ignora|olvida|omite|desobedece).{0,35}(instrucciones|reglas|prompt)|((muestra|revela|imprime|repite).{0,35}(prompt|mensaje del sistema|instrucciones internas|configuracion|secreto|credencial))|jailbreak|modo desarrollador|developer message|system prompt|actua como (si no|otro)|simula que no tienes reglas/i;
const OFF_TOPIC_PATTERN = /\b(receta|poema|cancion|cuento|novela|horoscopo|futbol|partido|presidente|capital de|tarea escolar|ensayo academico|traduce|traduccion|resumen de (un )?libro|resolver (esta )?ecuacion|chiste|rutina de ejercicio|dieta|diagnostico medico|consejo legal|pronostico del tiempo)\b/i;
const OPERATIONAL_SIGNALS = [
  /\b(call ?center|contact ?center|centro de contacto|mesa de ayuda)\b/i,
  /\b(llamad[aos]*|citas?|pacientes?|usuarios?|casos?|tickets?|pedidos?|contactos?|mensajes?|correos?)\b/i,
  /\b(diari[oa]s?|todos los dias|cada dia|semanal|mensual|frecuencia|turnos?)\b/i,
  /\b\d+\b|\b(cantidad|volumen|much[oa]s?|varios?|cientos?|miles?)\b/i,
  /\b(auxiliares?|agentes?|asesores?|empleados?|personas?|colaboradores?|enfermer[oa]s?|operadores?)\b/i,
  /\b(confirm[a-z]*|agend[a-z]*|respond[a-z]*|registr[a-z]*|gestion[a-z]*|atend[a-z]*|contact[a-z]*|valid[a-z]*|asign[a-z]*|report[a-z]*)\b/i,
];

function normalized(value) {
  return sanitizeText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function isAllowedSparkMessage(message, hasBusinessContext = false) {
  const text = normalized(message);
  if (INJECTION_PATTERN.test(text) || OFF_TOPIC_PATTERN.test(text)) return false;
  const operationalScore = OPERATIONAL_SIGNALS.reduce((score, pattern) => score + Number(pattern.test(text)), 0);
  return hasBusinessContext || IN_SCOPE_PATTERN.test(text) || operationalScore >= 2;
}

function enforceLightRateLimit(req) {
  if (process.env.SPARK_DEMO_MODE === "true") return;
  const forwarded = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const userAgent = String(req.headers["user-agent"] || "unknown").slice(0, 120);
  const key = crypto.createHmac("sha256", sessionSecret()).update(`${forwarded}:${userAgent}`).digest("hex");
  const now = Date.now();
  const current = rateWindows.get(key);
  const next = !current || current.startedAt <= now - RATE_WINDOW_MS
    ? { startedAt: now, count: 1 }
    : { startedAt: current.startedAt, count: current.count + 1 };
  rateWindows.set(key, next);
  if (rateWindows.size > 2000) {
    for (const [storedKey, window] of rateWindows) {
      if (window.startedAt <= now - RATE_WINDOW_MS) rateWindows.delete(storedKey);
    }
  }
  if (next.count > RATE_LIMIT) throw Object.assign(new Error("Alcanzaste el límite temporal de orientaciones. Intenta nuevamente en unos minutos."), { status: 429 });
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function readJsonBody(req, limit = 16000) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (Buffer.byteLength(raw) > limit) {
        reject(Object.assign(new Error("Payload demasiado grande."), { status: 413 }));
        req.destroy();
      }
    });
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(Object.assign(new Error("JSON inválido."), { status: 400 })); }
    });
    req.on("error", reject);
  });
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function sessionSecret() {
  const secret = process.env.SPARK_SESSION_SECRET;
  if (!secret || secret.length < 32) throw Object.assign(new Error("Spark no está configurado."), { code: "CONFIGURATION_REQUIRED" });
  return secret;
}

function signState(state) {
  const payload = base64url(JSON.stringify(state));
  const signature = crypto.createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyState(token) {
  if (!token || typeof token !== "string" || token.length > 24000) throw Object.assign(new Error("Sesión inválida."), { status: 400 });
  const [payload, signature] = token.split(".");
  if (!payload || !signature) throw Object.assign(new Error("Sesión inválida."), { status: 400 });
  const expected = crypto.createHmac("sha256", sessionSecret()).update(payload).digest();
  const received = Buffer.from(signature, "base64url");
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) throw Object.assign(new Error("Sesión inválida."), { status: 400 });
  const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (!state.createdAt || Date.now() - state.createdAt > MAX_SESSION_AGE_MS) throw Object.assign(new Error("La sesión expiró. Inicia una nueva conversación."), { status: 410 });
  if (!Array.isArray(state.messages) || state.messages.length > 8 || state.questionCount > MAX_QUESTIONS) throw Object.assign(new Error("Sesión inválida."), { status: 400 });
  return state;
}

function newState() {
  return {
    version: 1,
    sessionId: crypto.randomUUID(),
    createdAt: Date.now(),
    questionCount: 0,
    messages: [],
    proposal: null,
    serviceKeys: [],
  };
}

function sanitizeText(value, max = MAX_MESSAGE_LENGTH) {
  return String(value || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}

function estimateFromServiceKeys(keys) {
  const unique = [...new Set((Array.isArray(keys) ? keys : []).filter((key) => SERVICE_KEYS.includes(key)))].slice(0, 3);
  if (!unique.length) return { serviceKeys: [], hoursMin: null, hoursMax: null, investmentMin: null, investmentMax: null };
  const totals = unique.reduce((sum, key) => ({
    min: sum.min + EFFORT_MATRIX[key].min,
    max: sum.max + EFFORT_MATRIX[key].max,
  }), { min: 0, max: 0 });
  const internalRate = Number(process.env.SPARK_INTERNAL_HOURLY_RATE_COP);
  if (!Number.isSafeInteger(internalRate) || internalRate <= 0) throw Object.assign(new Error("La estimación interna no está configurada."), { code: "CONFIGURATION_REQUIRED" });
  return {
    serviceKeys: unique,
    hoursMin: totals.min,
    hoursMax: totals.max,
    investmentMin: totals.min * internalRate,
    investmentMax: totals.max * internalRate,
  };
}

function publicProposal(modelProposal) {
  const estimate = estimateFromServiceKeys(modelProposal.service_keys);
  const tools = Array.isArray(modelProposal.tools) ? modelProposal.tools.slice(0, 5).map((tool) => ({
    name: sanitizeText(tool.name, 60),
    purpose: sanitizeText(tool.purpose, 180),
  })).filter((tool) => tool.name && tool.purpose) : [];
  const proposal = {
    problem: sanitizeText(modelProposal.problem, 500),
    solution: sanitizeText(modelProposal.solution, 700),
    tools,
    scope: (Array.isArray(modelProposal.scope) ? modelProposal.scope : []).slice(0, 6).map((item) => sanitizeText(item, 220)).filter(Boolean),
    assumptions: (Array.isArray(modelProposal.assumptions) ? modelProposal.assumptions : []).slice(0, 6).map((item) => sanitizeText(item, 220)).filter(Boolean),
    investment: estimate.investmentMin === null ? {
      status: "pending",
      label: "Inversión pendiente de evaluación",
      currency: "COP",
      min: null,
      max: null,
    } : {
      status: "estimated",
      label: null,
      currency: "COP",
      min: estimate.investmentMin,
      max: estimate.investmentMax,
    },
    notice: PUBLIC_NOTICE,
    thirdPartyNotice: modelProposal.include_third_party_disclaimer ? THIRD_PARTY_NOTICE : null,
  };
  return { proposal, privateEstimate: estimate };
}

function pricingQuestion(message) {
  return /(tarifa\s*(por)?\s*hora|cu[aá]ntas?\s*horas?|valor\s*hora|precio\s*por\s*hora)/i.test(message);
}

function shortText(value, max) {
  const text = sanitizeText(value, max + 20);
  return text.length <= max ? text : `${text.slice(0, max - 1).trim()}…`;
}

function formatInvestment(investment) {
  if (!investment || investment.status !== "estimated") return "Pendiente de evaluación";
  const formatter = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  return investment.min === investment.max ? formatter.format(investment.min) : `${formatter.format(investment.min)} – ${formatter.format(investment.max)}`;
}

function whatsappUrl(reference, proposal) {
  const text = [
    "Hola, Andrés. Hablé con Spark y me interesa revisar esta propuesta.",
    "",
    `Referencia: ${reference}`,
    `Problema: ${shortText(proposal.problem, 150)}`,
    `Propuesta: ${shortText(proposal.solution, 190)}`,
    `Inversión estimada: ${formatInvestment(proposal.investment)}, pendiente de confirmación.`,
    "",
    "Quiero revisar el alcance contigo.",
  ].join("\n").slice(0, 900);
  return `https://wa.me/573042206989?text=${encodeURIComponent(text)}`;
}

module.exports = {
  MAX_QUESTIONS,
  MAX_MESSAGE_LENGTH,
  json,
  readJsonBody,
  signState,
  verifyState,
  newState,
  sanitizeText,
  estimateFromServiceKeys,
  publicProposal,
  pricingQuestion,
  isAllowedSparkMessage,
  enforceLightRateLimit,
  whatsappUrl,
};
