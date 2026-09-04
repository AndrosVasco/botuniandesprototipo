import { addMessage, getCurrentLanguage, getMemory, getRecentMessages, summarizeIntoMemory } from "../memory/sessionStore.js";
import { model, openai } from "../openai/client.js";
import type { Language, Program, SessionMemory, SimulationControls } from "../types/domain.js";
import { createActions, createProgramCard } from "./productUi.js";
import { detectMessageLanguage, extractRequestedCareer, isAdmissionsRelated, isOutOfScope } from "./messageParsing.js";
import { runFallbackAgent } from "./fallbackAgent.js";

const scopeReplies: Record<Language, string> = {
  es: "Este asistente te orienta únicamente sobre programas y admisiones. No puedo realizar tareas ajenas a este servicio. ¿Quieres consultar una carrera, requisitos, fechas o costos?",
  en: "This assistant only provides guidance about programs and admissions. I cannot perform tasks outside this service. Would you like to check a program, requirements, dates, or costs?",
  pt: "Este assistente orienta apenas sobre programas e admissões. Não posso realizar tarefas fora deste serviço. Deseja consultar um curso, requisitos, datas ou custos?"
};

function languageName(language: Language) { return language === "en" ? "English" : language === "pt" ? "Portuguese" : "Spanish"; }
async function naturalize(reply: string, language: Language, advisorMode = false) {
  if (!openai) return reply;
  const result = await openai.chat.completions.create({ model, temperature: 0.2, messages: [
    { role: "system", content: `Reply in ${languageName(language)} as a ${advisorMode ? "warm human Admissions advisor" : "concise admissions bot"}. Preserve every fact, consent requirement, identifier, channel and operational warning in the supplied answer. The interface header already identifies the test context: do not mention simulations, demonstrations, prototypes, fictional data, or unofficial information. Do not add university facts, links, dates, prices or promises.` },
    { role: "user", content: reply }
  ] });
  return result.choices[0]?.message?.content ?? reply;
}

function dynamicProgramReply(name: string, memory: SessionMemory, cohortOverride?: boolean) {
  const key = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const count = (memory.programConsultations[key] ?? 0) + 1;
  memory.programConsultations[key] = count;
  memory.currentProgramName = name;
  memory.programId = `dynamic:${key}`;
  const open = cohortOverride ?? count % 2 === 1;
  const language = memory.language;
  if (open) {
    const program: Program = language === "en"
      ? { id: memory.programId, name, cohortOpen: true, period: "2027-1", deadline: "November 30, 2026", requirements: ["Application form", "Academic documents"], applicationSteps: ["Review the program information", "Complete the application form", "Review and submit the information", "Receive the admission result"], enrollmentSteps: ["Accept the place", "Review the tuition", "Open the payment link", "Confirm enrollment"], studyStartSteps: ["Check the academic calendar", "Review the welcome guide", "Select courses", "Start classes on the scheduled date"], costCop: 24000000, source: "Academic program record", status: "Admissions open" }
      : language === "pt"
        ? { id: memory.programId, name, cohortOpen: true, period: "2027-1", deadline: "30 de novembro de 2026", requirements: ["Formulário de inscrição", "Documentos acadêmicos"], applicationSteps: ["Revisar as informações do curso", "Preencher o formulário de inscrição", "Revisar e enviar os dados", "Receber o resultado de admissão"], enrollmentSteps: ["Aceitar a vaga", "Revisar o valor da matrícula", "Abrir o link de pagamento", "Confirmar a matrícula"], studyStartSteps: ["Consultar o calendário acadêmico", "Revisar o guia de boas-vindas", "Selecionar disciplinas", "Iniciar as aulas na data programada"], costCop: 24000000, source: "Ficha acadêmica do curso", status: "Inscrições abertas" }
        : { id: memory.programId, name, cohortOpen: true, period: "2027-1", deadline: "30 de noviembre de 2026", requirements: ["Formulario de inscripción", "Documentos académicos"], applicationSteps: ["Revisar la información del programa", "Completar el formulario de inscripción", "Revisar y enviar los datos", "Recibir el resultado de admisión"], enrollmentSteps: ["Aceptar el cupo", "Revisar el valor de la matrícula", "Abrir el enlace de pago", "Confirmar la matrícula"], studyStartSteps: ["Consultar el calendario académico", "Revisar la guía de bienvenida", "Seleccionar materias", "Iniciar clases en la fecha programada"], costCop: 24000000, source: "Ficha académica del programa", status: "Admisiones abiertas" };
    const reply = language === "en" ? `**${name}** has an **available cohort** for the 2027-1 term.` : language === "pt" ? `**${name}** tem uma **turma disponível** para o período 2027-1.` : `**${name}** tiene una **cohorte abierta** para el periodo 2027-1.`;
    const actions = language === "en" ? [{ label: "Register interest via WhatsApp", message: `Register interest via WhatsApp for ${name}`, variant: "primary" as const }, { label: "Talk to Admissions", message: "Talk to Admissions" }] : language === "pt" ? [{ label: "Registrar interesse por WhatsApp", message: `Registrar interesse por WhatsApp para ${name}`, variant: "primary" as const }, { label: "Falar com Admissões", message: "Falar com Admissões" }] : [{ label: "Registrar interés por WhatsApp", message: `Registrar interés por WhatsApp para ${name}`, variant: "primary" as const }, { label: "Hablar con Admisiones", message: "Hablar con Admisiones" }];
    return { reply, toolUsed: "consultProgram", ui: createProgramCard(program, actions) };
  }
  const reply = language === "en" ? `**${name}** currently has **no available cohort** or confirmed future date. You may register your interest to receive updates.` : language === "pt" ? `**${name}** não tem **turma disponível** nem data futura confirmada no momento. Você pode registrar interesse para receber novidades.` : `**${name}** no tiene **cohorte abierta** ni una fecha futura confirmada en este momento. Puedes registrar tu interés para recibir novedades.`;
  const action = language === "en" ? { label: "Notify me via WhatsApp", message: `Register interest via WhatsApp for ${name}`, variant: "primary" as const } : language === "pt" ? { label: "Avisar por WhatsApp", message: `Registrar interesse por WhatsApp para ${name}`, variant: "primary" as const } : { label: "Avisarme por WhatsApp", message: `Registrar interés por WhatsApp para ${name}`, variant: "primary" as const };
  return { reply, toolUsed: "checkCohort", ui: createActions([action]) };
}

function simulatedProcessReply(message: string, memory: SessionMemory) {
  const lower = message.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const requestsPaymentLink = /(?:genera|generar|crea|crear|dame|obtener|generate|create|get|give me|gerar|criar|obter).*(?:pago|payment|pagamento)|(?:enlace|link).*(?:pago|payment|pagamento)/.test(lower);
  if (requestsPaymentLink) return memory.language === "en" ? "Here is your payment link: [Open payment portal](https://pagos.demo.invalid/uniandes). Review the amount and enrollment details before continuing." : memory.language === "pt" ? "Este é o seu link de pagamento: [Abrir portal de pagamentos](https://pagos.demo.invalid/uniandes). Revise o valor e os dados da matrícula antes de continuar." : "Este es tu enlace de pago: [Abrir portal de pagos](https://pagos.demo.invalid/uniandes). Revisa el valor y los datos de la matrícula antes de continuar.";
  const requestsEnrollment = /(?:genera|generar|crea|crear|simula|generate|create|simulate|make|gerar|criar|simular).*(?:matricul|enrollment)/.test(lower);
  if (requestsEnrollment) {
    const id = `MATR-DEMO-${String(Object.keys(memory.programConsultations).length + 1).padStart(4, "0")}`;
    return memory.language === "en" ? `Your enrollment request was created with reference **${id}**. Review the program and payment details to continue.` : memory.language === "pt" ? `Sua solicitação de matrícula foi criada com a referência **${id}**. Revise o curso e os dados de pagamento para continuar.` : `Tu solicitud de matrícula fue creada con la referencia **${id}**. Revisa el programa y los datos de pago para continuar.`;
  }
  return null;
}

function currentProgram(memory: SessionMemory) {
  if (memory.currentProgramName) return memory.currentProgramName;
  if (memory.programId === "systems") return memory.language === "en" ? "Systems Engineering" : memory.language === "pt" ? "Engenharia de Sistemas" : "Ingeniería de Sistemas";
  if (memory.programId === "design") return memory.language === "es" ? "Diseño" : "Design";
  return null;
}

function simulatedAcademicContext(memory: SessionMemory, simulation: SimulationControls) {
  const program = currentProgram(memory) ?? "not selected yet";
  const cohort = simulation.cohortOpen
    ? "OPEN: period 2027-1; application deadline November 30, 2026; tuition COP 24,000,000"
    : "CLOSED: no confirmed future period, deadline, or tuition";
  return `CURRENT SIMULATED RECORD (the only source of academic facts):
- Selected program: ${program}
- Cohort: ${cohort}
- Requirements: application form; academic documents
- Application: review program record -> complete application form -> review and submit -> receive admission result
- Enrollment: accept place -> review tuition -> open payment link -> confirm enrollment
- Before studying: check academic calendar -> review welcome guide -> select courses -> start on scheduled date
- Admissions availability: ${simulation.advisorOnline ? "online" : "offline"}
- Payment URL, only if explicitly requested: https://pagos.demo.invalid/uniandes (non-functional)
These values are fictional test data. The interface header already discloses that context, so never repeat or mention that they are simulated, fictional, demonstrative, unofficial, or part of a prototype in the conversation.`;
}

function localAiContextReply(memory: SessionMemory, simulation: SimulationControls) {
  const program = currentProgram(memory);
  const selected = program ? ` **${program}**` : (memory.language === "en" ? " the program you choose" : memory.language === "pt" ? " o curso que você escolher" : " el programa que elijas");
  const role = memory.advisorMode
    ? (memory.language === "en" ? "Admissions advisor" : memory.language === "pt" ? "assessor de Admissões" : "asesor de Admisiones")
    : (memory.language === "en" ? "admissions bot" : memory.language === "pt" ? "bot de admissões" : "bot de admisiones");
  if (memory.language === "en") return `As the ${role}, I can continue with${selected}. The requirements include the application form and academic documents. The application and enrollment process has four steps, and there is ${simulation.cohortOpen ? "an open 2027-1 cohort with tuition of COP 24,000,000" : "no open cohort or confirmed future date"}. What would you like me to explain?`;
  if (memory.language === "pt") return `Como ${role}, posso continuar com${selected}. Os requisitos incluem o formulário de inscrição e os documentos acadêmicos. O processo de inscrição e matrícula tem quatro etapas e há ${simulation.cohortOpen ? "uma turma 2027-1 aberta, com valor de COP 24.000.000" : "nenhuma turma aberta nem data futura confirmada"}. O que deseja que eu explique?`;
  return `Como ${role}, puedo continuar con${selected}. Los requisitos incluyen el formulario de inscripción y los documentos académicos. El proceso de inscripción y matrícula tiene cuatro pasos y hay ${simulation.cohortOpen ? "una cohorte 2027-1 abierta, con un valor de COP 24.000.000" : "ninguna cohorte abierta ni fecha futura confirmada"}. ¿Qué deseas que te explique?`;
}

function isControlledIntent(message: string) {
  const lower = message.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /(consultar un programa|programa y sus fechas|program and its dates|programa e suas datas|cohorte disponible|cohort (?:is )?available|turma disponivel|sistemas|systems|diseno|design|programa especial|special program|registrar interes|register interest|registrar interesse|notify me|avisar|intentar de nuevo|try again|tentar novamente)/.test(lower)
    || /(?:hablar|contactar|talk|contact|falar|contatar).*(?:admisiones|admissions|admissoes)/.test(lower);
}

async function aiConversation(sessionId: string, message: string, memory: SessionMemory, simulation: SimulationControls) {
  if (!openai) return localAiContextReply(memory, simulation);
  const result = await openai.chat.completions.create({ model, temperature: 0.35, messages: [
    { role: "system", content: `Reply in ${languageName(memory.language)} as ${memory.advisorMode ? "a warm human Admissions advisor" : "a clear conversational admissions bot"} in a technical Universidad de los Andes prototype.
${simulatedAcademicContext(memory, simulation)}
Maintain the selected program and facts across turns. Answer only questions about programs, cohorts, requirements, admissions, registration, enrollment, tuition, payments, or Admissions contact. Present the supplied record naturally and confidently. Never mention simulation, fiction, demonstration, unofficial data, prototypes, or internal controls. Never add university facts, links, people, policies, dates, prices, promises, or admission decisions beyond the supplied record. Do not request identity documents or sensitive data. If no program is selected and the answer depends on one, ask which program. If information is absent, say it is not currently available. Be natural, concise, and helpful.` },
    ...getRecentMessages(sessionId, 7).slice(0, -1).map((item) => ({ role: item.role, content: item.content } as const)),
    { role: "user", content: message }
  ] });
  return result.choices[0]?.message?.content ?? localAiContextReply(memory, simulation);
}

export async function handleChat(sessionId: string, message: string, mode: "demo" | "ai" = "demo", language: Language = "es", simulation: SimulationControls = { advisorOnline: true, cohortOpen: true, aiError: false }) {
  const responseLanguage = mode === "ai" ? detectMessageLanguage(message, getCurrentLanguage(sessionId) ?? language) : language;
  const memory = getMemory(sessionId, responseLanguage);
  addMessage(sessionId, { role: "user", content: message });
  const pending = memory.step !== "idle";
  const requestedCareer = extractRequestedCareer(message);
  const hasAiConversationContext = mode === "ai" && (memory.currentProgramName !== null || memory.advisorMode);
  if (isOutOfScope(message) || (!pending && !hasAiConversationContext && !requestedCareer && !isAdmissionsRelated(message))) {
    const reply = scopeReplies[responseLanguage]; addMessage(sessionId, { role: "assistant", content: reply }); summarizeIntoMemory(sessionId);
    return { reply, memory, toolUsed: null, ui: null };
  }

  if (mode === "ai" && simulation.aiError) {
    const reply = responseLanguage === "en" ? "We are experiencing technical difficulties. Please try again now or come back later. If the problem continues, contact Admissions through the available service channels." : responseLanguage === "pt" ? "Estamos enfrentando dificuldades técnicas. Tente novamente agora ou volte mais tarde. Se o problema continuar, entre em contato com Admissões pelos canais de atendimento disponíveis." : "Estamos presentando dificultades técnicas. Puedes reintentar ahora o volver más tarde. Si el inconveniente continúa, comunícate con Admisiones mediante los canales de atención disponibles.";
    addMessage(sessionId, { role: "assistant", content: reply }); summarizeIntoMemory(sessionId);
    return { reply, memory, toolUsed: "simulated_ai_disconnect", ui: createActions([{ label: responseLanguage === "en" ? "Retry AI" : responseLanguage === "pt" ? "Tentar IA novamente" : "Reintentar IA", message: "__retry_ai__", variant: "primary" }]) };
  }

  if (mode === "ai") {
    const processReply = simulatedProcessReply(message, memory);
    if (processReply) {
      const reply = await naturalize(processReply, responseLanguage, memory.advisorMode).catch(() => processReply);
      addMessage(sessionId, { role: "assistant", content: reply }); summarizeIntoMemory(sessionId);
      return { reply, memory, toolUsed: null, ui: null };
    }
    const career = requestedCareer;
    if (career && !/^(y\b|and\b|e\b)/i.test(career) && !/sistemas|diseño|diseno|especial/i.test(career)) {
      const local = dynamicProgramReply(career, memory, simulation.cohortOpen);
      const reply = local.reply;
      addMessage(sessionId, { role: "assistant", content: reply }); summarizeIntoMemory(sessionId);
      return { ...local, reply, memory };
    }
    if (!pending && (memory.advisorMode || !isControlledIntent(message))) {
      const reply = await aiConversation(sessionId, message, memory, simulation).catch(() => localAiContextReply(memory, simulation));
      addMessage(sessionId, { role: "assistant", content: reply }); summarizeIntoMemory(sessionId);
      return { reply, memory, toolUsed: null, ui: null };
    }
  }

  const local = await runFallbackAgent(message, memory, mode, simulation);
  let reply = local.reply;
  if (mode === "ai" && openai && !memory.useLocalFallback) {
    try { reply = await naturalize(local.reply, responseLanguage, memory.advisorMode); }
    catch (error) { console.error("OpenAI unavailable; using controlled local fallback", error); memory.useLocalFallback = true; }
  }
  addMessage(sessionId, { role: "assistant", content: reply }); summarizeIntoMemory(sessionId);
  return { reply, memory, toolUsed: local.toolUsed, ui: local.ui ?? null };
}
