import type { Language, MessageUi } from "../components/types";
export type ChatMode = "demo" | "ai";
export interface SimulationControls { advisorOnline: boolean; cohortOpen: boolean; aiError: boolean; }
export interface ChatResponse { reply: string; memory: Record<string, unknown>; toolUsed: string | null; ui?: MessageUi; }
const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:3001" : "");
export async function sendChatMessage(sessionId: string, message: string, mode: ChatMode, language: Language, simulation: SimulationControls): Promise<ChatResponse> {
  const response = await fetch(`${API_URL}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, message, mode, language, simulation }) });
  if (!response.ok) throw new Error("No fue posible contactar el asistente.");
  return response.json();
}
export async function resetChatSession(sessionId: string, language: Language) {
  await fetch(`${API_URL}/api/session/reset`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, language }) }).catch(() => undefined);
}
