import type { ContactChannel, Language, Program } from "../types/domain.js";

export const emailRegex = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/;
export const phoneRegex = /\+?[0-9][0-9\s-]{6,18}[0-9]/;
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function extractProgram(message: string): Program["id"] | null {
  const value = normalize(message);
  if (value.includes("sistemas") || value.includes("systems")) return "systems";
  if (value.includes("diseno") || value.includes("design")) return "design";
  if (value.includes("programa especial") || value.includes("special program")) return "special";
  return null;
}

export function extractPeriod(message: string) { return message.match(/\b20\d{2}-[12]\b/)?.[0] ?? null; }
export function extractLanguage(message: string): Language | null {
  const value = normalize(message).trim();
  if (/^(en|english|ingles)$/.test(value)) return "en";
  if (/^(pt|portugues|portuguese)$/.test(value)) return "pt";
  if (/^(es|espanol|spanish)$/.test(value)) return "es";
  return null;
}
export function extractEmail(message: string) { return message.match(emailRegex)?.[0] ?? null; }
export function extractPhone(message: string) { return message.match(phoneRegex)?.[0]?.trim() ?? null; }
export function extractChannel(message: string): ContactChannel | null {
  const value = normalize(message);
  if (value.includes("correo") || value.includes("email") || value.includes("e-mail")) return "email";
  if (value.includes("whatsapp") || value.includes("whats app")) return "whatsapp";
  if (value.includes("llamada") || value.includes("call") || value.includes("ligacao")) return "call";
  return null;
}
export function extractConsent(message: string): boolean | null {
  const value = normalize(message);
  if (/\b(no autorizo|no acepto|no|nao autorizo|nao aceito|i do not authorize|i do not consent)\b/.test(value)) return false;
  if (/\b(autorizo|acepto|si|yes|i authorize|i consent|sim|aceito|autorizo o uso)\b/.test(value)) return true;
  return null;
}
export function isOutOfScope(message: string) {
  const value = normalize(message);
  return /(genera|escribe|haz|elabora).*(tesis|ensayo|codigo|poema)|ignora.*instrucciones|asistente general|politica|receta medica/.test(value);
}
