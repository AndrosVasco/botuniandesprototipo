import type { ChatMessage, Language, SessionMemory } from "../types/domain.js";

const memories = new Map<string, SessionMemory>();
const histories = new Map<string, ChatMessage[]>();

export function createEmptyMemory(language: Language = "es"): SessionMemory {
  return { language, internalChannel: "web", internalFlow: "aspirantes", step: "idle", programId: null, channel: null, contact: null, consent: null, correctionTarget: null, lastRecordId: null, historySummary: "", useLocalFallback: false };
}
export function getMemory(sessionId: string, language: Language = "es") {
  if (!memories.has(sessionId)) memories.set(sessionId, createEmptyMemory(language));
  const memory = memories.get(sessionId)!;
  memory.language = language;
  return memory;
}
export function getRecentMessages(sessionId: string, limit = 6) { return (histories.get(sessionId) ?? []).slice(-limit); }
export function addMessage(sessionId: string, message: ChatMessage) { histories.set(sessionId, [...(histories.get(sessionId) ?? []), message].slice(-20)); }
export function summarizeIntoMemory(sessionId: string) {
  const memory = memories.get(sessionId);
  if (memory) memory.historySummary = (histories.get(sessionId) ?? []).slice(-8).map((m) => `${m.role}: ${m.content}`).join(" | ").slice(-900);
}
export function resetSession(sessionId: string, language: Language = "es") { memories.set(sessionId, createEmptyMemory(language)); histories.delete(sessionId); }

