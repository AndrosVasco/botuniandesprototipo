import { addMessage, getMemory, getRecentMessages, summarizeIntoMemory } from "../memory/sessionStore.js";
import { model, openai } from "../openai/client.js";
import type { Language, Program, SessionMemory } from "../types/domain.js";
import { createActions, createProgramCard } from "./productUi.js";
import { extractRequestedCareer, isAdmissionsRelated, isOutOfScope } from "./messageParsing.js";
import { runFallbackAgent } from "./fallbackAgent.js";

const scopeReplies: Record<Language, string> = {
  es: "Este asistente te orienta únicamente sobre programas y admisiones del prototipo. No puedo realizar tareas ajenas a este servicio. ¿Quieres consultar una carrera, requisitos, fechas o costos?",
  en: "This assistant only provides guidance about the prototype's programs and admissions. I cannot perform tasks outside this service. Would you like to check a program, requirements, dates, or costs?",
  pt: "Este assistente orienta apenas sobre programas e admissões do protótipo. Não posso realizar tarefas fora deste serviço. Deseja consultar um curso, requisitos, datas ou custos?"
};

function languageName(language: Language) { return language === "en" ? "English" : language === "pt" ? "Portuguese" : "Spanish"; }
async function naturalize(reply: string, language: Language, advisorMode = false) {
  if (!openai) return reply;
  const result = await openai.chat.completions.create({ model, temperature: 0.2, messages: [
    { role: "system", content: `Reply in ${languageName(language)} as a ${advisorMode ? "warm simulated human Admissions advisor" : "concise admissions bot"}. Preserve every fact, simulated label, limitation, consent requirement, identifier, channel and warning in the supplied operational answer. Do not add real university facts, real links, dates, prices or promises.` },
    { role: "user", content: reply }
  ] });
  return result.choices[0]?.message?.content ?? reply;
}

function dynamicProgramReply(name: string, memory: SessionMemory) {
  const key = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const count = (memory.programConsultations[key] ?? 0) + 1;
  memory.programConsultations[key] = count;
  memory.currentProgramName = name;
  memory.programId = `dynamic:${key}`;
  const open = count % 2 === 1;
  if (open) {
    const program: Program = { id: memory.programId, name, cohortOpen: true, period: "2027-1 (simulado)", deadline: "30 de noviembre de 2026 (simulada)", requirements: ["Formulario de inscripción simulado", "Documentos académicos simulados"], costCop: 24000000, source: "Ficha académica simulada", status: "Cohorte simulada abierta para esta consulta" };
    return { reply: `Para **${name}**, esta primera consulta muestra una **cohorte simulada abierta**. Los datos no son información oficial de la Universidad.`, toolUsed: "consultProgram", ui: createProgramCard(program, [{ label: "Registrar interés por WhatsApp", message: `Registrar interés por WhatsApp para ${name}`, variant: "primary" }, { label: "Hablar con Admisiones", message: "Hablar con Admisiones" }]) };
  }
  return { reply: `Para **${name}**, esta segunda consulta muestra **sin cohorte abierta** y sin fecha futura confirmada. No inventaré una fecha. Puedes registrar interés para contacto simulado.`, toolUsed: "checkCohort", ui: createActions([{ label: "Avisarme por WhatsApp", message: `Registrar interés por WhatsApp para ${name}`, variant: "primary" }]) };
}

function simulatedProcessReply(message: string, memory: SessionMemory) {
  const lower = message.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (lower.includes("pago") || lower.includes("payment")) return "Puedo generar únicamente un enlace de pago **no funcional** para la demostración: [Abrir pago simulado](https://pagos.demo.invalid/uniandes). No se realizará ningún cobro ni se enviarán datos a una pasarela real.";
  if (lower.includes("matricul") || lower.includes("enrollment")) return `Generé una posible matrícula **exclusivamente simulada**: **MATR-DEMO-${String(Object.keys(memory.programConsultations).length + 1).padStart(4, "0")}**. No crea un estudiante, no reserva cupo y no tiene validez académica.`;
  return null;
}

async function advisorConversation(sessionId: string, message: string, memory: SessionMemory) {
  if (!openai) return "Te atiendo como asesor simulado de Admisiones. Puedo aclarar dudas del prototipo sobre carreras, cohortes, requisitos, costos, matrícula simulada o pagos simulados. El modo IA está usando el respaldo local en este momento.";
  const result = await openai.chat.completions.create({ model, temperature: 0.35, messages: [
    { role: "system", content: `Responde en ${languageName(memory.language)} como un asesor humano simulado de Admisiones de la Universidad de los Andes dentro de un prototipo técnico. Conversa solo sobre programas, cohortes, requisitos, costos, admisiones, matrícula simulada y pagos simulados. Toda información debe declararse simulada; nunca afirmes datos oficiales, no inventes hechos de la Universidad, no prometas admisión ni tiempos, no solicites identificación, no generes cobros reales y no uses enlaces reales. Si falta un dato, dilo. Sé cálido, breve y natural.` },
    ...getRecentMessages(sessionId, 7).slice(0, -1).map((item) => ({ role: item.role, content: item.content } as const)),
    { role: "user", content: message }
  ] });
  return result.choices[0]?.message?.content ?? "No pude confirmar esa información simulada. Podemos revisar otra duda de admisiones.";
}

export async function handleChat(sessionId: string, message: string, mode: "demo" | "ai" = "demo", language: Language = "es") {
  const memory = getMemory(sessionId, language);
  addMessage(sessionId, { role: "user", content: message });
  const pending = memory.step !== "idle";
  if (isOutOfScope(message) || (!pending && !isAdmissionsRelated(message))) {
    const reply = scopeReplies[language]; addMessage(sessionId, { role: "assistant", content: reply }); summarizeIntoMemory(sessionId);
    return { reply, memory, toolUsed: null, ui: null };
  }

  if (mode === "ai") {
    const processReply = simulatedProcessReply(message, memory);
    if (processReply) {
      const reply = await naturalize(processReply, language, memory.advisorMode).catch(() => processReply);
      addMessage(sessionId, { role: "assistant", content: reply }); summarizeIntoMemory(sessionId);
      return { reply, memory, toolUsed: null, ui: null };
    }
    const career = extractRequestedCareer(message);
    if (career && !/sistemas|diseño|diseno|especial/i.test(career)) {
      const local = dynamicProgramReply(career, memory);
      const reply = await naturalize(local.reply, language, memory.advisorMode).catch(() => local.reply);
      addMessage(sessionId, { role: "assistant", content: reply }); summarizeIntoMemory(sessionId);
      return { ...local, reply, memory };
    }
    if (memory.advisorMode && !pending) {
      const reply = await advisorConversation(sessionId, message, memory).catch(() => "No pude confirmar esa información simulada. Podemos revisar otra duda de admisiones.");
      addMessage(sessionId, { role: "assistant", content: reply }); summarizeIntoMemory(sessionId);
      return { reply, memory, toolUsed: null, ui: null };
    }
  }

  const local = await runFallbackAgent(message, memory, mode);
  let reply = local.reply;
  if (mode === "ai" && openai && !memory.useLocalFallback) {
    try { reply = await naturalize(local.reply, language, memory.advisorMode); }
    catch (error) { console.error("OpenAI unavailable; using controlled local fallback", error); memory.useLocalFallback = true; }
  }
  addMessage(sessionId, { role: "assistant", content: reply }); summarizeIntoMemory(sessionId);
  return { reply, memory, toolUsed: local.toolUsed, ui: local.ui ?? null };
}
