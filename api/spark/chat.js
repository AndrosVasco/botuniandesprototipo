const {
  MAX_QUESTIONS,
  MAX_MESSAGE_LENGTH,
  json,
  readJsonBody,
  signState,
  verifyState,
  newState,
  sanitizeText,
  publicProposal,
  pricingQuestion,
  isAllowedSparkMessage,
  enforceLightRateLimit,
} = require("../_lib/spark-core");
const { callOpenAI, demoResponse } = require("../_lib/spark-openai");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Método no permitido." });
  }

  try {
    const body = await readJsonBody(req);
    const message = sanitizeText(body.message);
    if (!message) return json(res, 400, { error: "Escribe tu reto o respuesta para continuar." });
    if (String(body.message || "").length > MAX_MESSAGE_LENGTH) return json(res, 400, { error: `El mensaje debe tener máximo ${MAX_MESSAGE_LENGTH} caracteres.` });

    const state = body.sessionToken ? verifyState(body.sessionToken) : newState();
    const hasBusinessContext = state.messages.some((item) => item.role === "user");
    if (!pricingQuestion(message) && !isAllowedSparkMessage(message, hasBusinessContext)) {
      const reply = "Puedo ayudarte únicamente con retos de atención al cliente, procesos, automatización, integraciones y soluciones digitales para tu negocio. Cuéntame qué quieres mejorar en tu operación.";
      return json(res, 200, {
        mode: process.env.SPARK_DEMO_MODE === "true" ? "demo" : "live",
        action: "message",
        message: reply,
        questionCount: state.questionCount,
        maxQuestions: MAX_QUESTIONS,
        sessionToken: signState(state),
        proposal: null,
      });
    }
    if (state.proposal) return json(res, 409, { error: "Esta conversación ya tiene una propuesta. Puedes registrar tu interés o iniciar de nuevo." });
    if (state.messages.filter((item) => item.role === "user").length >= 4) return json(res, 429, { error: "Alcanzaste el límite de mensajes de esta orientación." });

    state.messages.push({ role: "user", content: message });

    if (pricingQuestion(message)) {
      const reply = "Spark presenta una inversión preliminar por solución. Andrés podrá revisar contigo el alcance y las condiciones.";
      state.messages.push({ role: "assistant", content: reply });
      return json(res, 200, {
        mode: process.env.SPARK_DEMO_MODE === "true" ? "demo" : "live",
        action: "message",
        message: reply,
        questionCount: state.questionCount,
        maxQuestions: MAX_QUESTIONS,
        sessionToken: signState(state),
        proposal: null,
      });
    }

    enforceLightRateLimit(req);

    const demoMode = process.env.SPARK_DEMO_MODE === "true";
    let result = demoMode ? demoResponse(state) : await callOpenAI(state);
    if (!result || !["ask", "propose", "decline"].includes(result.action)) throw Object.assign(new Error("Respuesta inválida."), { code: "OPENAI_ERROR" });

    if (result.action === "decline") {
      state.messages.pop();
      const reply = "Ese tema está fuera del alcance de Spark. Puedo orientarte sobre atención al cliente, procesos, automatización, integraciones y soluciones digitales para tu negocio.";
      return json(res, 200, {
        mode: demoMode ? "demo" : "live", action: "message", message: reply,
        questionCount: state.questionCount, maxQuestions: MAX_QUESTIONS,
        sessionToken: signState(state), proposal: null,
      });
    }

    if (result.action === "ask" && state.questionCount < MAX_QUESTIONS) {
      const question = sanitizeText(result.question, 320);
      if (!question) throw Object.assign(new Error("Pregunta inválida."), { code: "OPENAI_ERROR" });
      state.questionCount += 1;
      state.messages.push({ role: "assistant", content: question });
      return json(res, 200, {
        mode: demoMode ? "demo" : "live",
        action: "ask",
        message: question,
        questionCount: state.questionCount,
        maxQuestions: MAX_QUESTIONS,
        sessionToken: signState(state),
        proposal: null,
      });
    }

    if (result.action === "ask") {
      result = {
        action: "propose",
        question: null,
        problem: state.messages.find((item) => item.role === "user")?.content || "Reto pendiente de precisar",
        solution: "Realizar una sesión de diagnóstico con Andrés para validar el proceso, priorizar el objetivo y definir una solución adecuada.",
        tools: [],
        scope: ["Validación del proceso actual", "Definición de prioridades y alcance"],
        assumptions: ["Falta información crítica para recomendar herramientas o estimar una inversión con suficiente fundamento."],
        service_keys: [],
        include_third_party_disclaimer: false,
      };
    }

    const { proposal } = publicProposal(result);
    if (!proposal.problem || !proposal.solution) throw Object.assign(new Error("Propuesta incompleta."), { code: "OPENAI_ERROR" });
    state.proposal = proposal;
    state.serviceKeys = Array.isArray(result.service_keys) ? result.service_keys : [];
    state.messages.push({ role: "assistant", content: "Preparé una propuesta preliminar con base en lo que me contaste." });

    return json(res, 200, {
      mode: demoMode ? "demo" : "live",
      action: "propose",
      message: "Preparé una propuesta preliminar con base en lo que me contaste.",
      questionCount: state.questionCount,
      maxQuestions: MAX_QUESTIONS,
      sessionToken: signState(state),
      proposal,
    });
  } catch (error) {
    const status = error.status || (error.code === "CONFIGURATION_REQUIRED" ? 503 : error.code === "OPENAI_ERROR" ? 502 : 500);
    const publicMessage = error.code === "CONFIGURATION_REQUIRED"
      ? "Spark aún no está configurado para conversar. Puedes contactar directamente con Andrés."
      : error.code === "OPENAI_ERROR" || error.name === "AbortError"
        ? "Spark no pudo responder en este momento. Intenta nuevamente o contacta directamente con Andrés."
        : error.message === "Payload demasiado grande." || error.message === "JSON inválido." || error.status
          ? error.message
          : "Ocurrió un error al procesar la solicitud.";
    return json(res, status, { error: publicMessage, retryable: status >= 500 });
  }
};
