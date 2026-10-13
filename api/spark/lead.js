const crypto = require("node:crypto");
const {
  json,
  readJsonBody,
  verifyState,
  sanitizeText,
  estimateFromServiceKeys,
  whatsappUrl,
} = require("../_lib/spark-core");
const { sendSparkLeadEmail } = require("../_lib/spark-email");

function reference() {
  const date = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  return `SPK-${date}-${crypto.randomInt(1000, 10000)}`;
}

function validateContact(contact) {
  const name = sanitizeText(contact?.name, 100);
  const company = sanitizeText(contact?.company, 120);
  const whatsapp = sanitizeText(contact?.whatsapp, 40);
  const email = sanitizeText(contact?.email, 160).toLowerCase();
  if (!name) throw Object.assign(new Error("El nombre es obligatorio."), { status: 400 });
  if (!whatsapp && !email) throw Object.assign(new Error("Escribe un WhatsApp o correo."), { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error("El correo no es válido."), { status: 400 });
  if (whatsapp && !/^[+\d][\d\s()-]{6,24}$/.test(whatsapp)) throw Object.assign(new Error("El WhatsApp no es válido."), { status: 400 });
  return { name, company: company || null, whatsapp: whatsapp || null, email: email || null };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Método no permitido." });
  }

  try {
    if (process.env.SPARK_DEMO_MODE === "true") {
      return json(res, 503, { error: "Modo demostración: el envío real está desactivado.", demo: true });
    }

    const body = await readJsonBody(req, 20000);
    if (body.authorization !== true) return json(res, 400, { error: "Debes autorizar el envío de la conversación y tus datos." });

    const state = verifyState(body.sessionToken);
    if (!state.proposal) return json(res, 400, { error: "Primero debes completar una propuesta con Spark." });

    const contact = validateContact(body.contact);
    const estimate = estimateFromServiceKeys(state.serviceKeys);
    const ref = reference();
    const questionsAndAnswers = [];
    for (let index = 0; index < state.messages.length - 1; index += 1) {
      if (state.messages[index].role === "assistant" && state.messages[index + 1]?.role === "user") {
        questionsAndAnswers.push({ question: state.messages[index].content, answer: state.messages[index + 1].content });
      }
    }

    await sendSparkLeadEmail({
      reference: ref,
      date: new Date().toISOString(),
      contact,
      authorization: true,
      problem: state.proposal.problem,
      summary: state.proposal.solution,
      questionsAndAnswers,
      proposal: state.proposal,
      tools: state.proposal.tools,
      scope: state.proposal.scope,
      assumptions: state.proposal.assumptions,
      internalEstimate: { hoursMin: estimate.hoursMin, hoursMax: estimate.hoursMax },
      investment: { min: estimate.investmentMin, max: estimate.investmentMax, currency: "COP" },
      conversation: state.messages,
      status: "interés enviado",
    });

    return json(res, 201, {
      status: "interest_sent",
      reference: ref,
      notification: "sent",
      whatsappUrl: whatsappUrl(ref, state.proposal),
    });
  } catch (error) {
    const status = error.status || (error.code === "CONFIGURATION_REQUIRED" ? 503 : 500);
    const message = error.status
      ? error.message
      : "No fue posible enviar tu solicitud. Intenta nuevamente o escríbele directamente a Andrés.";
    return json(res, status, { error: message, retryable: status >= 500 });
  }
};
