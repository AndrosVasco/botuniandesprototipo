const test = require("node:test");
const assert = require("node:assert/strict");

process.env.SPARK_SESSION_SECRET = "test-secret-with-at-least-thirty-two-characters";
process.env.SPARK_INTERNAL_HOURLY_RATE_COP = "160000";

const {
  estimateFromServiceKeys,
  publicProposal,
  newState,
  signState,
  verifyState,
} = require("../api/_lib/spark-core");

test("calcula la inversión en servidor sin publicar horas ni tarifa", () => {
  const result = publicProposal({
    problem: "Proceso manual",
    solution: "Automatizar el flujo",
    tools: [{ name: "n8n", purpose: "Conectar el proceso" }],
    scope: ["Flujo inicial"],
    assumptions: [],
    service_keys: ["n8n_automation"],
    include_third_party_disclaimer: true,
  });
  assert.equal(result.proposal.investment.min, 1920000);
  assert.equal(result.proposal.investment.max, 2400000);
  const publicJson = JSON.stringify(result.proposal);
  assert.equal(/hour|hora|160000|serviceKeys|service_keys/i.test(publicJson), false);
  assert.equal(result.privateEstimate.hoursMin, 12);
  assert.equal(result.privateEstimate.hoursMax, 15);
});

test("mantiene la banda máxima en 25 por ciento para estimaciones combinadas", () => {
  const estimate = estimateFromServiceKeys(["discovery", "zendesk_setup", "ai_assistant"]);
  assert.equal(estimate.investmentMin, 9600000);
  assert.equal(estimate.investmentMax, 12000000);
  assert.equal(estimate.investmentMax / estimate.investmentMin, 1.25);
});

test("estima consultoría de mejora digital aunque no haya herramienta definida", () => {
  const estimate = estimateFromServiceKeys(["process_consulting"]);
  assert.equal(estimate.investmentMin, 1920000);
  assert.equal(estimate.investmentMax, 2400000);
});

test("publica capacidades genéricas y un MVP sin nombres de plataformas", () => {
  const result = publicProposal({
    problem: "Atención manual en Zendesk y WhatsApp",
    solution: "Conectar Zendesk con n8n y OpenAI",
    tools: [{ name: "Zendesk + n8n", purpose: "Automatizar WhatsApp con OpenAI" }],
    scope: ["Configurar Zendesk"],
    assumptions: ["El cliente ya usa Vercel y Supabase"],
    service_keys: ["zendesk_optimization", "n8n_automation"],
    include_third_party_disclaimer: true,
  });
  const publicJson = JSON.stringify(result.proposal);
  assert.equal(/zendesk|n8n|whatsapp|openai|vercel|supabase/i.test(publicJson), false);
  assert.ok(result.proposal.scope.includes("Producto mínimo viable costo-eficiente"));
  assert.ok(result.proposal.scope.includes("Calibración y pruebas"));
  assert.ok(result.proposal.scope.includes("Capacitación y monitoreo inicial"));
});

test("rechaza un token de sesión manipulado", () => {
  const token = signState(newState());
  const [payload, signature] = token.split(".");
  const manipulatedPayload = `${payload[0] === "a" ? "b" : "a"}${payload.slice(1)}`;
  const manipulated = `${manipulatedPayload}.${signature}`;
  assert.throws(() => verifyState(manipulated), /Sesión inválida/);
});

test("el servidor rechaza estados con más de tres preguntas", () => {
  const state = newState();
  state.questionCount = 4;
  assert.throws(() => verifyState(signState(state)), /Sesión inválida/);
});
