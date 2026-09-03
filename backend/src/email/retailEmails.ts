import type { InterestRecord } from "../types/domain.js";
import { sendDemoEmail } from "./emailService.js";

export function sendInterestConfirmation(record: InterestRecord, programName: string) {
  if (record.channel !== "email") return Promise.resolve({ ok: false as const, reason: "not_email" });
  return sendDemoEmail({
    to: record.contact,
    subject: `Confirmación demostrativa ${record.id}`,
    title: "Registro de interés simulado",
    body: `Programa: ${programName}\nSolicitud: ${record.id}\nEl registro de interés no reserva un cupo.`
  });
}

