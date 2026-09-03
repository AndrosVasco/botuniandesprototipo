import { addMessage, getMemory, summarizeIntoMemory } from "../memory/sessionStore.js";
import { model, openai } from "../openai/client.js";
import type { Language } from "../types/domain.js";
import { isOutOfScope } from "./messageParsing.js";
import { runFallbackAgent } from "./fallbackAgent.js";

const scopeReplies: Record<Language, string> = {
  es: "Este asistente te orienta sobre programas y admisiones. No puedo elaborar una tesis ni realizar tareas ajenas a este servicio. ¿Quieres consultar requisitos, fechas o costos?",
  en: "This assistant provides guidance about programs and admissions. I cannot write a thesis or perform tasks outside this service. Would you like to check requirements, dates, or costs?",
  pt: "Este assistente orienta sobre programas e admissões. Não posso elaborar uma tese nem realizar tarefas fora deste serviço. Deseja consultar requisitos, datas ou custos?"
};

async function naturalize(reply: string, language: Language) {
  if (!openai) return reply;
  const languageName = language === "en" ? "English" : language === "pt" ? "Portuguese" : "Spanish";
  const result = await openai.chat.completions.create({
    model,
    temperature: 0.15,
    messages: [
      { role: "system", content: `You are a concise admissions prototype assistant. Reply in ${languageName}. Preserve every fact, limitation, simulated status, consent requirement, identifier, channel and warning in the supplied operational answer. Do not add university facts, dates, prices or promises. Never claim a real transfer, call, message or admission.` },
      { role: "user", content: reply }
    ]
  });
  return result.choices[0]?.message?.content ?? reply;
}

export async function handleChat(sessionId: string, message: string, mode: "demo" | "ai" = "demo", language: Language = "es") {
  const memory = getMemory(sessionId, language);
  addMessage(sessionId, { role: "user", content: message });

  // El límite de alcance se aplica antes de cualquier llamada al modelo o herramienta.
  if (isOutOfScope(message)) {
    const reply = scopeReplies[language];
    addMessage(sessionId, { role: "assistant", content: reply });
    summarizeIntoMemory(sessionId);
    return { reply, memory, toolUsed: null, ui: null };
  }

  const local = await runFallbackAgent(message, memory);
  let reply = local.reply;
  if (mode === "ai" && openai && !memory.useLocalFallback) {
    try {
      reply = await naturalize(local.reply, language);
    } catch (error) {
      console.error("OpenAI unavailable; using controlled local fallback", error);
      memory.useLocalFallback = true;
    }
  }
  addMessage(sessionId, { role: "assistant", content: reply });
  summarizeIntoMemory(sessionId);
  return { reply, memory, toolUsed: local.toolUsed, ui: local.ui ?? null };
}

