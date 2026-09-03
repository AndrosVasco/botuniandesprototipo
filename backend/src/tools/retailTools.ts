import { db } from "../data/mockData.js";
import type { ContactChannel, InterestRecord, Program } from "../types/domain.js";
import { validateContact } from "../validators/customerValidators.js";

export function consultProgram(programId: Program["id"]) { return db.programs.find((program) => program.id === programId) ?? null; }
export function checkCohort(programId: Program["id"]) {
  const program = consultProgram(programId);
  return program ? { programId, cohortOpen: program.cohortOpen, period: program.period, deadline: program.deadline } : null;
}
function createRecord(kind: InterestRecord["kind"], input: { programId?: Program["id"] | null; channel: ContactChannel; contact: string; consent: boolean }) {
  if (!input.consent || !validateContact(input.channel, input.contact)) return { ok: false as const };
  const record: InterestRecord = { id: `SOL-${String(db.interests.length + 1).padStart(4, "0")}`, programId: input.programId ?? null, channel: input.channel, contact: input.contact, consent: true, kind, status: "simulated", internalChannel: "web", internalFlow: "aspirantes" };
  db.interests.push(record);
  return { ok: true as const, record };
}
export function registerInterest(input: { programId: Program["id"]; channel: ContactChannel; contact: string; consent: boolean }) { return createRecord("interest", input); }
export function checkAdvisorAvailability(mode: "demo" | "ai" = "demo") {
  return mode === "demo"
    ? { available: false, schedule: "Lunes a viernes, 8:00 a. m. a 5:00 p. m. (simulado)" }
    : { available: db.advisorAvailable, schedule: "Disponibilidad simulada para modo IA" };
}
export function requestAdvisorContact(input: { channel: ContactChannel; contact: string; consent: boolean }) { return createRecord("advisor-contact", input); }
export function cancelInterest(recordId: string) {
  const record = db.interests.find((item) => item.id === recordId);
  if (!record) return { ok: false as const };
  record.status = "cancelled";
  return { ok: true as const, record };
}
export const tools = { consultProgram, checkCohort, registerInterest, checkAdvisorAvailability, requestAdvisorContact, cancelInterest };
