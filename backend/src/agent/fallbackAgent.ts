import type { ContactChannel, Language, SessionMemory, SimulationControls } from "../types/domain.js";
import { sendInterestConfirmation } from "../email/retailEmails.js";
import { createActions, createProgramCard, type MessageUi } from "./productUi.js";
import { extractChannel, extractConsent, extractEmail, extractPhone, extractProgram, isOutOfScope } from "./messageParsing.js";
import { tools } from "../tools/retailTools.js";
import { validateContact } from "../validators/customerValidators.js";

type Result = { reply: string; toolUsed: string | null; ui?: MessageUi };
const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const copy = {
  es: {
    scope: "Este asistente te orienta sobre programas y admisiones. No puedo elaborar una tesis ni realizar tareas ajenas a este servicio. ¿Quieres consultar requisitos, fechas o costos?",
    welcome: "Hola. Puedo orientarte con información simulada sobre programas, cohortes y contacto con Admisiones. ¿Qué deseas consultar?",
    unavailable: "No pude confirmar esa información. Podemos intentarlo de nuevo o consultar a Admisiones.",
    noCohort: "**Diseño** no tiene una cohorte abierta y no hay una fecha futura confirmada. No inventaré una fecha. Puedes registrar tu interés para recibir una novedad simulada.",
    chooseChannel: "Elige un canal de contacto. Solo te pediré el dato correspondiente.",
    askEmail: "Escribe el correo electrónico que deseas registrar.",
    askPhone: "Escribe el número de teléfono que deseas registrar.",
    invalid: "El dato no tiene un formato válido. Revísalo e inténtalo de nuevo.",
    consent: "¿Autorizas el uso de este dato únicamente para este registro simulado?",
    denied: "No se realizó ningún registro porque no otorgaste autorización.",
    confirm: "Revisa el resumen antes de confirmar:",
    interestDone: "Registro de interés simulado confirmado. **Esto no reserva un cupo.**",
    advisorTask: "Tu solicitud quedó registrada. Te atenderemos en nuestro horario hábil, de **lunes a viernes de 8:00 a. m. a 5:00 p. m.** El tiempo de respuesta estimado de nuestros asesores es de **30 minutos** dentro de ese horario. Esta es una tarea demostrativa; la llamada aún no se ha realizado.",
    advisorDone: "Tu solicitud quedó registrada. Te atenderemos en nuestro horario hábil, de **lunes a viernes de 8:00 a. m. a 5:00 p. m.** El tiempo de respuesta estimado de nuestros asesores es de **30 minutos** dentro de ese horario. _Registro simulado para el prototipo._",
    transfer: "Admisiones aparece disponible en la simulación. Iniciando una **transferencia simulada**; no se ha contactado a una persona real.",
    closed: "El equipo de Admisiones está cerrado en este momento. Horario simulado: **lunes a viernes, de 8:00 a. m. a 5:00 p. m.** Puedes dejar una solicitud de contacto.",
    failed: "No fue posible completar la acción simulada. No se registró nada. Puedes intentarlo de nuevo o contactar a Admisiones."
  },
  en: {
    scope: "This assistant provides guidance about programs and admissions. I cannot write a thesis or perform tasks outside this service. Would you like to check requirements, dates, or costs?",
    welcome: "Hello. I can guide you with simulated information about programs, cohorts, and Admissions contact. What would you like to check?",
    unavailable: "I could not confirm that information. We can try again or contact Admissions.",
    noCohort: "**Design** has no open cohort and no confirmed future date. I will not invent a date. You may register your interest for a simulated notification.",
    chooseChannel: "Choose a contact channel. I will only request the corresponding detail.", askEmail: "Enter the email address you want to register.", askPhone: "Enter the phone number you want to register.", invalid: "That detail is not in a valid format. Please review it and try again.", consent: "Do you authorize use of this detail solely for this simulated registration?", denied: "Nothing was registered because authorization was not granted.", confirm: "Review the summary before confirming:", interestDone: "Simulated interest registration confirmed. **This does not reserve a place.**", advisorTask: "Your request has been registered. We will assist you during business hours, **Monday through Friday from 8:00 a.m. to 5:00 p.m.** The estimated advisor response time is **30 minutes** during those hours. This is a demonstration task; no call has been made yet.", advisorDone: "Your request has been registered. We will assist you during business hours, **Monday through Friday from 8:00 a.m. to 5:00 p.m.** The estimated advisor response time is **30 minutes** during those hours. _Simulated prototype registration._", transfer: "Admissions appears available in the simulation. Starting a **simulated transfer**; no real person has been contacted.", closed: "Admissions is currently closed. Simulated hours: **Monday through Friday, 8:00 a.m. to 5:00 p.m.** You may leave a contact request.", failed: "The simulated action could not be completed. Nothing was registered. You can try again or contact Admissions."
  },
  pt: {
    scope: "Este assistente orienta sobre programas e admissões. Não posso elaborar uma tese nem realizar tarefas fora deste serviço. Deseja consultar requisitos, datas ou custos?",
    welcome: "Olá. Posso orientar com informações simuladas sobre programas, turmas e contato com Admissões. O que deseja consultar?",
    unavailable: "Não consegui confirmar essa informação. Podemos tentar novamente ou consultar Admissões.",
    noCohort: "**Design** não tem turma aberta nem data futura confirmada. Não vou inventar uma data. Você pode registrar interesse para receber uma notificação simulada.",
    chooseChannel: "Escolha um canal de contato. Pedirei somente o dado correspondente.", askEmail: "Digite o e-mail que deseja registrar.", askPhone: "Digite o telefone que deseja registrar.", invalid: "O dado não tem um formato válido. Revise e tente novamente.", consent: "Você autoriza o uso deste dado somente para este registro simulado?", denied: "Nenhum registro foi feito porque não houve autorização.", confirm: "Revise o resumo antes de confirmar:", interestDone: "Registro de interesse simulado confirmado. **Isso não reserva uma vaga.**", advisorTask: "Sua solicitação foi registrada. Atenderemos você no horário comercial, de **segunda a sexta, das 8h às 17h.** O tempo estimado de resposta dos nossos assessores é de **30 minutos** dentro desse horário. Esta é uma tarefa demonstrativa; a ligação ainda não foi realizada.", advisorDone: "Sua solicitação foi registrada. Atenderemos você no horário comercial, de **segunda a sexta, das 8h às 17h.** O tempo estimado de resposta dos nossos assessores é de **30 minutos** dentro desse horário. _Registro simulado para o protótipo._", transfer: "Admissões aparece disponível na simulação. Iniciando uma **transferência simulada**; nenhuma pessoa real foi contatada.", closed: "Admissões está fechada neste momento. Horário simulado: **segunda a sexta, das 8h às 17h.** Você pode deixar uma solicitação de contato.", failed: "Não foi possível concluir a ação simulada. Nada foi registrado. Você pode tentar novamente ou contatar Admissões."
  }
} as const;

const channelLabel: Record<Language, Record<ContactChannel, string>> = { es: { email: "Correo", whatsapp: "WhatsApp", call: "Llamada" }, en: { email: "Email", whatsapp: "WhatsApp", call: "Call" }, pt: { email: "E-mail", whatsapp: "WhatsApp", call: "Ligação" } };
function channelActions(language: Language) { return (["email", "whatsapp", "call"] as ContactChannel[]).map((channel) => ({ label: channelLabel[language][channel], message: channelLabel[language][channel], variant: "secondary" as const })); }
function consentActions(language: Language) { return language === "en" ? [{ label: "I authorize", message: "I authorize", variant: "primary" as const }, { label: "I do not authorize", message: "I do not authorize" }] : language === "pt" ? [{ label: "Autorizo", message: "Autorizo", variant: "primary" as const }, { label: "Não autorizo", message: "Não autorizo" }] : [{ label: "Autorizo", message: "Autorizo", variant: "primary" as const }, { label: "No autorizo", message: "No autorizo" }]; }
function confirmActions(language: Language) { return language === "en" ? [{ label: "Confirm", message: "Confirm", variant: "primary" as const }, { label: "Correct detail", message: "Correct detail" }] : language === "pt" ? [{ label: "Confirmar", message: "Confirmar", variant: "primary" as const }, { label: "Corrigir dado", message: "Corrigir dado" }] : [{ label: "Confirmar", message: "Confirmar", variant: "primary" as const }, { label: "Corregir dato", message: "Corregir dato" }]; }
function unavailableActions(language: Language) { return language === "en" ? [{ label: "Try again", message: "Try again" }, { label: "Contact Admissions", message: "Contact Admissions" }] : language === "pt" ? [{ label: "Tentar novamente", message: "Tentar novamente" }, { label: "Contatar Admissões", message: "Contatar Admissões" }] : [{ label: "Intentar de nuevo", message: "Intentar de nuevo" }, { label: "Contactar a Admisiones", message: "Contactar a Admisiones" }]; }
function resetContact(memory: SessionMemory) { memory.channel = null; memory.contact = null; memory.consent = null; }
function contactPrompt(language: Language, channel: ContactChannel) { return channel === "email" ? copy[language].askEmail : copy[language].askPhone; }
function summary(memory: SessionMemory) { return `${copy[memory.language].confirm}\n\n**Canal:** ${channelLabel[memory.language][memory.channel!]}\n**Dato:** ${memory.contact}\n**Autorización:** Sí`; }

export async function runFallbackAgent(message: string, memory: SessionMemory, mode: "demo" | "ai" = "demo", simulation?: SimulationControls): Promise<Result> {
  const language = memory.language;
  const t = copy[language];
  const lower = message.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (isOutOfScope(message)) return { reply: t.scope, toolUsed: null };
  if (lower.includes("simular falla") || lower.includes("simulate failure")) return { reply: t.failed, toolUsed: "simulated_failure", ui: createActions(unavailableActions(language)) };

  if (memory.step === "choose_interest_channel" || memory.step === "choose_advisor_channel") {
    const channel = extractChannel(message);
    if (!channel) return { reply: t.chooseChannel, toolUsed: null, ui: createActions(channelActions(language)) };
    memory.channel = channel;
    memory.step = memory.step === "choose_interest_channel" ? "await_interest_contact" : "await_advisor_contact";
    return { reply: contactPrompt(language, channel), toolUsed: null };
  }
  if (memory.step === "await_interest_contact" || memory.step === "await_advisor_contact" || memory.step === "correct_contact") {
    const contact = memory.channel === "email" ? extractEmail(message) : extractPhone(message);
    if (!contact || !memory.channel || !validateContact(memory.channel, contact)) return { reply: t.invalid, toolUsed: null };
    memory.contact = contact;
    const target = memory.step === "correct_contact" ? memory.correctionTarget : memory.step === "await_interest_contact" ? "interest" : "advisor";
    memory.step = target === "interest" ? "await_interest_consent" : "await_advisor_consent";
    return { reply: t.consent, toolUsed: null, ui: createActions(consentActions(language)) };
  }
  if (memory.step === "await_interest_consent" || memory.step === "await_advisor_consent") {
    const consent = extractConsent(message);
    if (consent === null) return { reply: t.consent, toolUsed: null, ui: createActions(consentActions(language)) };
    if (!consent) { memory.step = "idle"; resetContact(memory); return { reply: t.denied, toolUsed: null }; }
    memory.consent = true;
    memory.step = memory.step === "await_interest_consent" ? "confirm_interest" : "confirm_advisor_contact";
    return { reply: summary(memory), toolUsed: null, ui: createActions(confirmActions(language)) };
  }
  if (memory.step === "confirm_interest" || memory.step === "confirm_advisor_contact") {
    if (/correg|correct/.test(lower)) {
      memory.correctionTarget = memory.step === "confirm_interest" ? "interest" : "advisor";
      memory.step = "correct_contact";
      memory.contact = null;
      return { reply: contactPrompt(language, memory.channel!), toolUsed: null };
    }
    if (!/confirm/.test(lower)) return { reply: summary(memory), toolUsed: null, ui: createActions(confirmActions(language)) };
    if (memory.step === "confirm_interest") {
      const result = tools.registerInterest({ programId: memory.programId!, channel: memory.channel!, contact: memory.contact!, consent: true });
      if (!result.ok) return { reply: t.failed, toolUsed: "registerInterest" };
      memory.lastRecordId = result.record.id;
      const program = tools.consultProgram(memory.programId!);
      if (program) await sendInterestConfirmation(result.record, program.name).catch(() => ({ ok: false }));
      const reply = memory.channel === "call" ? `${t.interestDone}\n\n${t.advisorTask}` : t.interestDone;
      memory.step = "idle"; resetContact(memory);
      return { reply, toolUsed: "registerInterest" };
    }
    const result = tools.requestAdvisorContact({ channel: memory.channel!, contact: memory.contact!, consent: true });
    if (!result.ok) return { reply: t.failed, toolUsed: "requestAdvisorContact" };
    memory.lastRecordId = result.record.id;
    const reply = memory.channel === "call" ? t.advisorTask : t.advisorDone;
    memory.step = "idle"; resetContact(memory);
    return { reply, toolUsed: "requestAdvisorContact" };
  }

  const programId = extractProgram(message);
  if (programId === "special" || lower.includes("intentar de nuevo") || lower.includes("try again") || lower.includes("tentar novamente")) {
    memory.programId = "special";
    return { reply: t.unavailable, toolUsed: "consultProgram", ui: createActions(unavailableActions(language)) };
  }
  if (lower.includes("avisar") || lower.includes("notify me") || lower.includes("registrar interes") || lower.includes("registrar interesse") || lower.includes("register interest")) {
    memory.programId ??= "design"; resetContact(memory);
    const requestedChannel = extractChannel(message);
    if (requestedChannel) {
      memory.channel = requestedChannel;
      memory.step = "await_interest_contact";
      return { reply: contactPrompt(language, requestedChannel), toolUsed: null };
    }
    memory.step = "choose_interest_channel";
    return { reply: t.chooseChannel, toolUsed: null, ui: createActions(channelActions(language)) };
  }
  if (programId === "systems" || lower.includes("consultar un programa") || lower.includes("programa y sus fechas") || lower.includes("program and its dates") || lower.includes("programa e suas datas")) {
    const program = { ...tools.consultProgram("systems")! };
    if (mode === "ai" && simulation?.cohortOpen === false) {
      program.cohortOpen = false; program.period = null; program.deadline = null; program.status = "Sin cohorte abierta (simulación controlada)";
      memory.programId = "systems";
      return { reply: "**Ingeniería de Sistemas** no tiene cohorte abierta en esta simulación y no hay una fecha futura confirmada. Puedes registrar interés por WhatsApp.", toolUsed: "checkCohort", ui: createActions([{ label: "Avisarme por WhatsApp", message: "Registrar interés por WhatsApp para Ingeniería de Sistemas", variant: "primary" }]) };
    }
    memory.programId = "systems";
    const actions = language === "en" ? [{ label: "Register interest", message: "Register interest for Systems Engineering", variant: "primary" as const }, { label: "Talk to Admissions", message: "Talk to Admissions" }] : language === "pt" ? [{ label: "Registrar interesse", message: "Registrar interesse em Engenharia de Sistemas", variant: "primary" as const }, { label: "Falar com Admissões", message: "Falar com Admissões" }] : [{ label: "Registrar interés", message: "Registrar interés para Ingeniería de Sistemas", variant: "primary" as const }, { label: "Hablar con Admisiones", message: "Hablar con Admisiones" }];
    return { reply: language === "en" ? "I found this simulated program information." : language === "pt" ? "Encontrei estas informações simuladas do programa." : "Encontré esta información simulada del programa.", toolUsed: "consultProgram", ui: createProgramCard(program, actions) };
  }
  if (programId === "design" || lower.includes("cohorte disponible") || lower.includes("cohort available") || lower.includes("turma disponivel")) {
    memory.programId = "design";
    if (mode === "ai" && simulation?.cohortOpen === true) {
      const base = tools.consultProgram("design")!;
      const program = { ...base, cohortOpen: true, period: "2027-1 (simulado)", deadline: "30 de noviembre de 2026 (simulada)", requirements: ["Formulario de inscripción simulado", "Documentos académicos simulados"], costCop: 24000000, status: "Cohorte simulada abierta" };
      return { reply: "**Diseño** tiene cohorte abierta en esta simulación controlada.", toolUsed: "checkCohort", ui: createProgramCard(program, [{ label: "Registrar interés por WhatsApp", message: "Registrar interés por WhatsApp para Diseño", variant: "primary" }]) };
    }
    const label = language === "en" ? "Notify me when it opens" : language === "pt" ? "Avisar quando abrir" : "Avisarme cuando se abra";
    return { reply: t.noCohort, toolUsed: "checkCohort", ui: createActions([{ label, message: label, variant: "primary" }]) };
  }
  if (lower.includes("admisiones") || lower.includes("admissions") || lower.includes("admissoes")) {
    if (lower.includes("contactar") || lower.includes("contact request") || lower.includes("no disponible")) {
      memory.step = "choose_advisor_channel"; resetContact(memory);
      return { reply: t.chooseChannel, toolUsed: "checkAdvisorAvailability", ui: createActions(channelActions(language)) };
    }
    if (mode === "demo" || simulation?.advisorOnline === false) return { reply: mode === "demo" ? t.closed : "Admisiones aparece **offline** en esta simulación. Puedes dejar una solicitud de contacto; no se promete un tiempo de respuesta.", toolUsed: "checkAdvisorAvailability", ui: createActions([{ label: language === "en" ? "Leave contact request" : language === "pt" ? "Deixar solicitação" : "Dejar solicitud", message: language === "en" ? "Contact Admissions" : language === "pt" ? "Contatar Admissões" : "Contactar a Admisiones", variant: "primary" }]) };
    memory.advisorMode = true;
    return { reply: language === "en" ? "You are now in the **simulated Admissions advisor** experience. I can clarify questions about programs, cohorts, requirements, costs, enrollment and simulated payments." : language === "pt" ? "Agora você está na experiência de **assessor simulado de Admissões**. Posso esclarecer dúvidas sobre programas, turmas, requisitos, custos, matrícula e pagamentos simulados." : "Ahora te atiendo como **asesor simulado de Admisiones**. Puedo aclarar dudas sobre programas, cohortes, requisitos, costos, matrícula y pagos simulados.", toolUsed: "checkAdvisorAvailability" };
  }
  return { reply: t.welcome, toolUsed: null };
}
