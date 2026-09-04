import type { Language, MessageUi } from "../components/types";
export type ChatMode = "demo" | "ai";
export interface SimulationControls { advisorOnline: boolean; cohortOpen: boolean; aiError: boolean; }
export interface AccessSession { token: string; expiresAt: number; }
export interface ChatResponse { reply: string; memory: Record<string, unknown>; toolUsed: string | null; ui?: MessageUi; }
const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:3001" : "");

export class AccessExpiredError extends Error {}
async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, init);
  const body = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) throw new AccessExpiredError(body.error ?? "Acceso no autorizado.");
  if (!response.ok) throw new Error(body.error ?? "No fue posible completar la solicitud.");
  return body;
}
export function unlockApplication(code: string): Promise<AccessSession> { return request("/api/access/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }); }
export function unlockAi(code: string, token: string): Promise<AccessSession> { return request("/api/access/unlock-ai", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ code }) }); }
export function sendChatMessage(sessionId: string, message: string, mode: ChatMode, language: Language, simulation: SimulationControls, token: string): Promise<ChatResponse> {
  return request("/api/chat", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ sessionId, message, mode, language, simulation }) });
}
export async function resetChatSession(sessionId: string, language: Language, token: string) {
  await request("/api/session/reset", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ sessionId, language }) }).catch(() => undefined);
}
