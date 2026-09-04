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
    welcome: "Hola. Puedo orientarte sobre programas, cohortes y contacto con Admisiones. ¿Qué deseas consultar?",
    unavailable: "No pude confirmar esa información. Podemos intentarlo de nuevo o consultar a Admisiones.",
    noCohort: "**Diseño** no tiene una cohorte abierta y no hay una fecha futura confirmada. Puedes registrar tu interés para recibir novedades.",
    chooseChannel: "Elige un canal de contacto. Solo te pediré el dato correspondiente.",
    askEmail: "Escribe el correo electrónico que deseas registrar.",
    askPhone: "Escribe el número de teléfono que deseas registrar.",
    invalidEmail: "El correo no tiene un formato válido. Escríbelo nuevamente, por ejemplo: **nombre@ejemplo.com**.",
    invalidPhone: "El número no tiene un formato válido. Escríbelo nuevamente usando entre 7 y 15 dígitos, por ejemplo: **3001234567** o **+57 300 123 4567**.",
    consent: "¿Autorizas el uso de este dato para gestionar tu solicitud?",
    denied: "No se realizó ningún registro porque no otorgaste autorización.",
    confirm: "Revisa el resumen antes de confirmar:",
    interestDone: "Tu registro de interés fue confirmado. **Esto no reserva un cupo.**",
    advisorTask: "Tu solicitud quedó registrada. Te atenderemos en nuestro horario hábil, de **lunes a viernes de 8:00 a. m. a 5:00 p. m.** El tiempo de respuesta estimado de nuestros asesores es de **30 minutos** dentro de ese horario.",
    advisorDone: "Tu solicitud quedó registrada. Te atenderemos en nuestro horario hábil, de **lunes a viernes de 8:00 a. m. a 5:00 p. m.** El tiempo de respuesta estimado de nuestros asesores es de **30 minutos** dentro de ese horario.",
    transfer: "Admisiones está disponible. Te comunicaré con un asesor para continuar la atención.",
    closed: "El equipo de Admisiones está cerrado en este momento. Horario: **lunes a viernes, de 8:00 a. m. a 5:00 p. m.** Puedes dejar una solicitud de contacto.",
    failed: "No fue posible completar la acción. No se registró nada. Puedes intentarlo de nuevo o contactar a Admisiones."
  },
  en: {
    scope: "This assistant provides guidance about programs and admissions. I cannot write a thesis or perform tasks outside this service. Would you like to check requirements, dates, or costs?",
    welcome: "Hello. I can guide you through programs, cohorts, and Admissions contact. What would you like to check?",
    unavailable: "I could not confirm that information. We can try again or contact Admissions.",
    noCohort: "**Design** has no open cohort and no confirmed future date. You may register your interest to receive updates.",
    chooseChannel: "Choose a contact channel. I will only request the corresponding detail.", askEmail: "Enter the email address you want to register.", askPhone: "Enter the phone number you want to register.", invalidEmail: "That email format is not valid. Enter it again, for example: **name@example.com**.", invalidPhone: "That number format is not valid. Enter 7 to 15 digits, for example: **3001234567** or **+57 300 123 4567**.", consent: "Do you authorize the use of this detail to manage your request?", denied: "Nothing was registered because authorization was not granted.", confirm: "Review the summary before confirming:", interestDone: "Your interest registration has been confirmed. **This does not reserve a place.**", advisorTask: "Your request has been registered. We will assist you during business hours, **Monday through Friday from 8:00 a.m. to 5:00 p.m.** The estimated advisor response time is **30 minutes** during those hours.", advisorDone: "Your request has been registered. We will assist you during business hours, **Monday through Friday from 8:00 a.m. to 5:00 p.m.** The estimated advisor response time is **30 minutes** during those hours.", transfer: "Admissions is available. I will connect you with an advisor to continue.", closed: "Admissions is currently closed. Business hours are **Monday through Friday, 8:00 a.m. to 5:00 p.m.** You may leave a contact request.", failed: "The action could not be completed. Nothing was registered. You can try again or contact Admissions."
  },
  pt: {
    scope: "Este assistente orienta sobre programas e admissões. Não posso elaborar uma tese nem realizar tarefas fora deste serviço. Deseja consultar requisitos, datas ou custos?",
    welcome: "Olá. Posso orientar sobre cursos, turmas e contato com Admissões. O que deseja consultar?",
    unavailable: "Não consegui confirmar essa informação. Podemos tentar novamente ou consultar Admissões.",
    noCohort: "**Design** não tem turma aberta nem data futura confirmada. Você pode registrar interesse para receber novidades.",
    chooseChannel: "Escolha um canal de contato. Pedirei somente o dado correspondente.", askEmail: "Digite o e-mail que deseja registrar.", askPhone: "Digite o telefone que deseja registrar.", invalidEmail: "O formato do e-mail não é válido. Digite novamente, por exemplo: **nome@exemplo.com**.", invalidPhone: "O formato do número não é válido. Digite entre 7 e 15 números, por exemplo: **3001234567** ou **+57 300 123 4567**.", consent: "Você autoriza o uso deste dado para gerenciar sua solicitação?", denied: "Nenhum registro foi feito porque não houve autorização.", confirm: "Revise o resumo antes de confirmar:", interestDone: "Seu registro de interesse foi confirmado. **Isso não reserva uma vaga.**", advisorTask: "Sua solicitação foi registrada. Atenderemos você no horário comercial, de **segunda a sexta, das 8h às 17h.** O tempo estimado de resposta dos nossos assessores é de **30 minutos** dentro desse horário.", advisorDone: "Sua solicitação foi registrada. Atenderemos você no horário comercial, de **segunda a sexta, das 8h às 17h.** O tempo estimado de resposta dos nossos assessores é de **30 minutos** dentro desse horário.", transfer: "Admissões está disponível. Vou encaminhar você a um assessor para continuar.", closed: "Admissões está fechada neste momento. O horário é de **segunda a sexta, das 8h às 17h.** Você pode deixar uma solicitação de contato.", failed: "Não foi possível concluir a ação. Nada foi registrado. Você pode tentar novamente ou contatar Admissões."
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
    if (!contact || !memory.channel || !validateContact(memory.channel, contact)) return { reply: memory.channel === "email" ? t.invalidEmail : t.invalidPhone, toolUsed: null };
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
    memory.currentProgramName = language === "en" ? "Special Program" : "Programa Especial";
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
      program.cohortOpen = false; program.period = null; program.deadline = null; program.status = "Sin cohorte abierta";
      memory.programId = "systems";
      memory.currentProgramName = language === "en" ? "Systems Engineering" : language === "pt" ? "Engenharia de Sistemas" : "Ingeniería de Sistemas";
      const reply = language === "en" ? "**Systems Engineering** has no available cohort or confirmed future date. You may register interest via WhatsApp." : language === "pt" ? "**Engenharia de Sistemas** não tem turma disponível nem data futura confirmada. Você pode registrar interesse por WhatsApp." : "**Ingeniería de Sistemas** no tiene cohorte abierta ni una fecha futura confirmada. Puedes registrar interés por WhatsApp.";
      const action = language === "en" ? { label: "Notify me via WhatsApp", message: "Register interest via WhatsApp for Systems Engineering", variant: "primary" as const } : language === "pt" ? { label: "Avisar por WhatsApp", message: "Registrar interesse por WhatsApp para Engenharia de Sistemas", variant: "primary" as const } : { label: "Avisarme por WhatsApp", message: "Registrar interés por WhatsApp para Ingeniería de Sistemas", variant: "primary" as const };
      return { reply, toolUsed: "checkCohort", ui: createActions([action]) };
    }
    memory.programId = "systems";
    memory.currentProgramName = language === "en" ? "Systems Engineering" : language === "pt" ? "Engenharia de Sistemas" : "Ingeniería de Sistemas";
    const actions = language === "en" ? [{ label: "Register interest", message: "Register interest for Systems Engineering", variant: "primary" as const }, { label: "Talk to Admissions", message: "Talk to Admissions" }] : language === "pt" ? [{ label: "Registrar interesse", message: "Registrar interesse em Engenharia de Sistemas", variant: "primary" as const }, { label: "Falar com Admissões", message: "Falar com Admissões" }] : [{ label: "Registrar interés", message: "Registrar interés para Ingeniería de Sistemas", variant: "primary" as const }, { label: "Hablar con Admisiones", message: "Hablar con Admisiones" }];
    return { reply: language === "en" ? "I found this program information." : language === "pt" ? "Encontrei estas informações do curso." : "Encontré esta información del programa.", toolUsed: "consultProgram", ui: createProgramCard(program, actions) };
  }
  if (programId === "design" || lower.includes("cohorte disponible") || lower.includes("cohort available") || lower.includes("cohort is available") || lower.includes("turma disponivel")) {
    memory.programId = "design";
    memory.currentProgramName = language === "es" ? "Diseño" : "Design";
    if (mode === "ai" && simulation?.cohortOpen === true) {
      const base = tools.consultProgram("design")!;
      const program = { ...base, cohortOpen: true, period: "2027-1", deadline: "30 de noviembre de 2026", requirements: ["Formulario de inscripción", "Documentos académicos"], costCop: 24000000, status: "Admisiones abiertas" };
      const reply = language === "en" ? "**Design** has an available cohort for the 2027-1 term." : language === "pt" ? "**Design** tem uma turma disponível para o período 2027-1." : "**Diseño** tiene una cohorte abierta para el periodo 2027-1.";
      const action = language === "en" ? { label: "Register interest via WhatsApp", message: "Register interest via WhatsApp for Design", variant: "primary" as const } : language === "pt" ? { label: "Registrar interesse por WhatsApp", message: "Registrar interesse por WhatsApp para Design", variant: "primary" as const } : { label: "Registrar interés por WhatsApp", message: "Registrar interés por WhatsApp para Diseño", variant: "primary" as const };
      return { reply, toolUsed: "checkCohort", ui: createProgramCard(program, [action]) };
    }
    const label = language === "en" ? "Notify me when it opens" : language === "pt" ? "Avisar quando abrir" : "Avisarme cuando se abra";
    return { reply: t.noCohort, toolUsed: "checkCohort", ui: createActions([{ label, message: label, variant: "primary" }]) };
  }
  if (lower.includes("admisiones") || lower.includes("admissions") || lower.includes("admissoes") || /\b(asesor|persona|humano|advisor|agent|human|assessor|atendente)\b/.test(lower)) {
    if (lower.includes("contactar") || lower.includes("contact admissions") || lower.includes("contact request") || lower.includes("contatar admissoes") || lower.includes("no disponible")) {
      memory.step = "choose_advisor_channel"; resetContact(memory);
      return { reply: t.chooseChannel, toolUsed: "checkAdvisorAvailability", ui: createActions(channelActions(language)) };
    }
    if (mode === "demo" || simulation?.advisorOnline === false) {
      const offline = language === "en" ? "Admissions is currently **offline**. You may leave a contact request." : language === "pt" ? "Admissões está **offline** no momento. Você pode deixar uma solicitação de contato." : "Admisiones está **offline** en este momento. Puedes dejar una solicitud de contacto.";
      return { reply: mode === "demo" ? t.closed : offline, toolUsed: "checkAdvisorAvailability", ui: createActions([{ label: language === "en" ? "Leave contact request" : language === "pt" ? "Deixar solicitação" : "Dejar solicitud", message: language === "en" ? "Contact Admissions" : language === "pt" ? "Contatar Admissões" : "Contactar a Admisiones", variant: "primary" }]) };
    }
    memory.advisorMode = true;
    return { reply: language === "en" ? "Hello, I’m **Andrés from Uniandes Admissions**. Tell me what you need and I’ll guide you through programs, enrollment and payment options." : language === "pt" ? "Olá, sou **Andrés, da equipe de Admissões Uniandes**. Conte o que você precisa e vou orientar sobre cursos, matrícula e opções de pagamento." : "Hola, soy **Andrés, de Admisiones Uniandes**. Cuéntame qué necesitas y te orientaré sobre programas, inscripción y opciones de pago.", toolUsed: "checkAdvisorAvailability" };
  }
  if (mode === "demo") {
    const reply = language === "en"
      ? "That request is outside the current guided Demo flow. Use **Restart conversation** and choose one of the three quick options, or enable **AI mode** to ask conversational questions about programs and admissions."
      : language === "pt"
        ? "Essa solicitação está fora do fluxo guiado atual do modo Demo. Use **Reiniciar conversa** e escolha uma das três opções rápidas, ou ative o **modo IA** para fazer perguntas sobre programas e admissões."
        : "Esta solicitud está fuera del recorrido guiado actual del modo Demo. Usa **Reiniciar conversación** y elige uno de los tres accesos rápidos, o activa el **modo IA** para consultar de forma conversacional sobre programas y admisiones.";
    return { reply, toolUsed: null };
  }
  return { reply: t.welcome, toolUsed: null };
}
