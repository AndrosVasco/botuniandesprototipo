import type { ContactChannel, Language, Program } from "../types/domain.js";

export const emailRegex = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/;
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
export function extractPhone(message: string) {
  const value = message.trim();
  if (!/^\+?[0-9\s()\-]+$/.test(value)) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 ? value : null;
}
export function detectMessageLanguage(message: string, fallback: Language): Language {
  const value = normalize(message);
  const scores: Record<Language, number> = { es: 0, en: 0, pt: 0 };
  const terms: Record<Language, string[]> = {
    es: ["quiero", "necesito", "puedo", "carrera", "cohorte", "correo", "llamada", "admisiones", "requisitos", "gracias", "hola", "autorizo", "confirmar"],
    en: ["i want", "need", "can i", "program", "career", "cohort", "email", "call", "admissions", "requirements", "thank", "hello", "authorize", "confirm"],
    pt: ["quero", "preciso", "posso", "curso", "turma", "e-mail", "ligacao", "admissoes", "requisitos", "obrigad", "ola", "autorizo", "confirmar"]
  };
  for (const language of ["es", "en", "pt"] as Language[]) for (const term of terms[language]) if (value.includes(term)) scores[language] += term.includes(" ") ? 2 : 1;
  const best = (["es", "en", "pt"] as Language[]).sort((a, b) => scores[b] - scores[a])[0];
  return scores[best] > 0 && scores[best] > scores[fallback] ? best : fallback;
}
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

export function isAdmissionsRelated(message: string) {
  const value = normalize(message);
  return ["hola", "gracias", "programa", "carrera", "pregrado", "posgrado", "maestria", "especializacion", "doctorado", "admis", "cohorte", "turma", "requisito", "fecha", "costo", "cuesta", "valor", "beca", "financi", "inscrip", "matricul", "pago", "aspirante", "universidad", "uniandes", "sistemas", "diseno", "ingenieria", "derecho", "medicina", "economia", "arquitectura", "psicologia", "program", "career", "undergraduate", "graduate", "master", "cohort", "requirement", "date", "cost", "admissions", "design", "engineering", "medicine", "course", "requirements", "quero", "curso", "informacoes", "datas", "custos", "pagamento", "contact", "correo", "email", "whatsapp", "llamada", "call", "ligacao", "autoriz", "authorize", "confirm", "correg", "correct", "avisar", "notify", "interes", "interest", "simular falla", "reintent", "try again", "intentar de nuevo"].some((term) => value.includes(term));
}

export function extractRequestedCareer(message: string) {
  const patterns = [
    /(?:carrera|programa|pregrado|posgrado|maestr[ií]a|especializaci[oó]n|doctorado|career|program|undergraduate|graduate|master|course|curso)\s+(?:de|en|in|of)?\s*([\p{L}][\p{L}\s]{2,60})/iu,
    /(?:estudiar|consultar|informaci[oó]n (?:de|sobre)|study|information (?:about|on)|informa[cç][oõ]es (?:sobre|do|de))\s+([\p{L}][\p{L}\s]{2,60})/iu
  ];
  for (const pattern of patterns) {
    const value = message.match(pattern)?.[1]?.trim().replace(/[?.!,;:].*$/, "").replace(/^(?:the|o|a)\s+/i, "").replace(/\s+(?:program|course|programa|curso)$/i, "");
    if (value) return value;
  }
  return null;
}
