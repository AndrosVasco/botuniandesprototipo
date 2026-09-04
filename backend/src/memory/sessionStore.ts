import type { ChatMessage, Language, SessionMemory } from "../types/domain.js";

const memories = new Map<string, SessionMemory>();
const histories = new Map<string, ChatMessage[]>();

export function createEmptyMemory(language: Language = "es"): SessionMemory {
  return { language, internalChannel: "web", internalFlow: "aspirantes", step: "idle", programId: null, channel: null, contact: null, consent: null, correctionTarget: null, lastRecordId: null, historySummary: "", useLocalFallback: false, advisorMode: false, currentProgramName: null, programConsultations: {} };
}
export function getMemory(sessionId: string, language: Language = "es") {
  if (!memories.has(sessionId)) memories.set(sessionId, createEmptyMemory(language));
  const memory = memories.get(sessionId)!;
  memory.language = language;
  return memory;
}
export function getCurrentLanguage(sessionId: string) { return memories.get(sessionId)?.language ?? null; }
export function getRecentMessages(sessionId: string, limit = 6) { return (histories.get(sessionId) ?? []).slice(-limit); }
export function addMessage(sessionId: string, message: ChatMessage) { histories.set(sessionId, [...(histories.get(sessionId) ?? []), message].slice(-20)); }
export function summarizeIntoMemory(sessionId: string) {
  const memory = memories.get(sessionId);
  if (memory) memory.historySummary = (histories.get(sessionId) ?? []).slice(-8).map((m) => `${m.role}: ${m.content}`).join(" | ").slice(-900);
}
export function resetSession(sessionId: string, language: Language = "es") { memories.set(sessionId, createEmptyMemory(language)); histories.delete(sessionId); }

export function restoreSession(sessionId: string, language: Language, input: unknown, previousMessages: unknown) {
  const memory = getMemory(sessionId, language);
  if (input && typeof input === "object") {
    const source = input as Record<string, unknown>;
    const steps: SessionMemory["step"][] = ["idle", "choose_interest_channel", "await_interest_contact", "await_interest_consent", "confirm_interest", "choose_advisor_channel", "await_advisor_contact", "await_advisor_consent", "confirm_advisor_contact", "correct_contact"];
    if (steps.includes(source.step as SessionMemory["step"])) memory.step = source.step as SessionMemory["step"];
    if (typeof source.programId === "string" && source.programId.length <= 100) memory.programId = source.programId;
    if (typeof source.currentProgramName === "string" && source.currentProgramName.length <= 100) memory.currentProgramName = source.currentProgramName;
    if (typeof source.advisorMode === "boolean") memory.advisorMode = source.advisorMode;
    if (source.channel === "email" || source.channel === "whatsapp" || source.channel === "call") memory.channel = source.channel;
    if (typeof source.contact === "string" && source.contact.length <= 254) memory.contact = source.contact;
    if (typeof source.consent === "boolean") memory.consent = source.consent;
    if (source.correctionTarget === "interest" || source.correctionTarget === "advisor") memory.correctionTarget = source.correctionTarget;
    if (typeof source.lastRecordId === "string" && source.lastRecordId.length <= 100) memory.lastRecordId = source.lastRecordId;
    if (source.programConsultations && typeof source.programConsultations === "object") {
      memory.programConsultations = Object.fromEntries(Object.entries(source.programConsultations as Record<string, unknown>).slice(0, 20).filter(([, value]) => typeof value === "number" && value >= 0 && value <= 100)) as Record<string, number>;
    }
  }
  if (Array.isArray(previousMessages)) {
    const safe = previousMessages.slice(-10).flatMap((item): ChatMessage[] => {
      if (!item || typeof item !== "object") return [];
      const value = item as Record<string, unknown>;
      if ((value.role !== "user" && value.role !== "assistant") || typeof value.content !== "string") return [];
      return [{ role: value.role, content: value.content.slice(0, 2000) }];
    });
    histories.set(sessionId, safe);
  }
}
