import { addMessage, getCurrentLanguage, getMemory, getRecentMessages, summarizeIntoMemory } from "../memory/sessionStore.js";
import { model, openai } from "../openai/client.js";
import type { Language, Program, SessionMemory, SimulationControls } from "../types/domain.js";
import { createActions, createProgramCard } from "./productUi.js";
import { detectMessageLanguage, extractRequestedCareer, isAdmissionsRelated, isOutOfScope } from "./messageParsing.js";
import { runFallbackAgent } from "./fallbackAgent.js";

const scopeReplies: Record<Language, string> = {
  es: "Este asistente te orienta únicamente sobre programas y admisiones del prototipo. No puedo realizar tareas ajenas a este servicio. ¿Quieres consultar una carrera, requisitos, fechas o costos?",
  en: "This assistant only provides guidance about the prototype's programs and admissions. I cannot perform tasks outside this service. Would you like to check a program, requirements, dates, or costs?",
  pt: "Este assistente orienta apenas sobre programas e admissões do protótipo. Não posso realizar tarefas fora deste serviço. Deseja consultar um curso, requisitos, datas ou custos?"
};

function languageName(language: Language) { return language === "en" ? "English" : language === "pt" ? "Portuguese" : "Spanish"; }
async function naturalize(reply: string, language: Language, advisorMode = false) {
  if (!openai) return reply;
  const result = await openai.chat.completions.create({ model, temperature: 0.2, messages: [
    { role: "system", content: `Reply in ${languageName(language)} as a ${advisorMode ? "warm simulated human Admissions advisor" : "concise admissions bot"}. Preserve every fact, simulated label, limitation, consent requirement, identifier, channel and warning in the supplied operational answer. Do not add real university facts, real links, dates, prices or promises.` },
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
      ? { id: memory.programId, name, cohortOpen: true, period: "2027-1 (simulated)", deadline: "November 30, 2026 (simulated)", requirements: ["Simulated application form", "Simulated academic documents"], applicationSteps: ["Review the simulated program record", "Complete the demonstration form", "Review and submit the information", "Receive a simulated admission result"], enrollmentSteps: ["Accept the simulated place", "Review the demonstration cost", "Open the non-functional payment link", "Confirm simulated enrollment"], studyStartSteps: ["Check the simulated calendar", "Review the welcome guide", "Select demonstration courses", "Start classes on the simulated date"], costCop: 24000000, source: "Simulated academic record", status: "Simulated cohort available" }
      : language === "pt"
        ? { id: memory.programId, name, cohortOpen: true, period: "2027-1 (simulado)", deadline: "30 de novembro de 2026 (simulada)", requirements: ["Formulário de inscrição simulado", "Documentos acadêmicos simulados"], applicationSteps: ["Revisar a ficha simulada do curso", "Preencher o formulário demonstrativo", "Revisar e enviar os dados", "Receber o resultado simulado de admissão"], enrollmentSteps: ["Aceitar a vaga simulada", "Revisar o valor demonstrativo", "Abrir o link de pagamento não funcional", "Confirmar a matrícula simulada"], studyStartSteps: ["Consultar o calendário simulado", "Revisar o guia de boas-vindas", "Selecionar disciplinas demonstrativas", "Iniciar as aulas na data simulada"], costCop: 24000000, source: "Ficha acadêmica simulada", status: "Turma simulada disponível" }
        : { id: memory.programId, name, cohortOpen: true, period: "2027-1 (simulado)", deadline: "30 de noviembre de 2026 (simulada)", requirements: ["Formulario de inscripción simulado", "Documentos académicos simulados"], applicationSteps: ["Revisar la ficha simulada del programa", "Completar el formulario demostrativo", "Revisar y enviar los datos", "Recibir el resultado simulado de admisión"], enrollmentSteps: ["Aceptar el cupo simulado", "Revisar el valor demostrativo", "Abrir el enlace de pago no funcional", "Confirmar la matrícula simulada"], studyStartSteps: ["Consultar el calendario simulado", "Revisar la guía de bienvenida", "Seleccionar materias de demostración", "Iniciar clases en la fecha simulada"], costCop: 24000000, source: "Ficha académica simulada", status: "Cohorte simulada abierta para esta consulta" };
    const reply = language === "en" ? `For **${name}**, the controlled configuration shows an **available simulated cohort**. This is not official university information.` : language === "pt" ? `Para **${name}**, a configuração controlada mostra uma **turma simulada disponível**. Esta não é uma informação oficial da Universidade.` : `Para **${name}**, la configuración controlada muestra una **cohorte simulada abierta**. Los datos no son información oficial de la Universidad.`;
    const actions = language === "en" ? [{ label: "Register interest via WhatsApp", message: `Register interest via WhatsApp for ${name}`, variant: "primary" as const }, { label: "Talk to Admissions", message: "Talk to Admissions" }] : language === "pt" ? [{ label: "Registrar interesse por WhatsApp", message: `Registrar interesse por WhatsApp para ${name}`, variant: "primary" as const }, { label: "Falar com Admissões", message: "Falar com Admissões" }] : [{ label: "Registrar interés por WhatsApp", message: `Registrar interés por WhatsApp para ${name}`, variant: "primary" as const }, { label: "Hablar con Admisiones", message: "Hablar con Admisiones" }];
    return { reply, toolUsed: "consultProgram", ui: createProgramCard(program, actions) };
  }
  const reply = language === "en" ? `For **${name}**, the controlled configuration shows **no available cohort** and no confirmed future date. I will not invent a date. You may register interest for simulated contact.` : language === "pt" ? `Para **${name}**, a configuração controlada mostra **nenhuma turma disponível** e nenhuma data futura confirmada. Não vou inventar uma data. Você pode registrar interesse para contato simulado.` : `Para **${name}**, la configuración controlada muestra **sin cohorte abierta** y sin fecha futura confirmada. No inventaré una fecha. Puedes registrar interés para contacto simulado.`;
  const action = language === "en" ? { label: "Notify me via WhatsApp", message: `Register interest via WhatsApp for ${name}`, variant: "primary" as const } : language === "pt" ? { label: "Avisar por WhatsApp", message: `Registrar interesse por WhatsApp para ${name}`, variant: "primary" as const } : { label: "Avisarme por WhatsApp", message: `Registrar interés por WhatsApp para ${name}`, variant: "primary" as const };
  return { reply, toolUsed: "checkCohort", ui: createActions([action]) };
}

function simulatedProcessReply(message: string, memory: SessionMemory) {
  const lower = message.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const requestsPaymentLink = /(?:genera|generar|crea|crear|dame|obtener|generate|create|get|give me|gerar|criar|obter).*(?:pago|payment|pagamento)|(?:enlace|link).*(?:pago|payment|pagamento)/.test(lower);
  if (requestsPaymentLink) return memory.language === "en" ? "I can only generate a **non-functional** demonstration payment link: [Open simulated payment](https://pagos.demo.invalid/uniandes). No charge or real payment-gateway submission will occur." : memory.language === "pt" ? "Só posso gerar um link de pagamento **não funcional** para demonstração: [Abrir pagamento simulado](https://pagos.demo.invalid/uniandes). Nenhuma cobrança ou envio a uma plataforma real será realizado." : "Puedo generar únicamente un enlace de pago **no funcional** para la demostración: [Abrir pago simulado](https://pagos.demo.invalid/uniandes). No se realizará ningún cobro ni se enviarán datos a una pasarela real.";
  const requestsEnrollment = /(?:genera|generar|crea|crear|simula|generate|create|simulate|make|gerar|criar|simular).*(?:matricul|enrollment)/.test(lower);
  if (requestsEnrollment) {
    const id = `MATR-DEMO-${String(Object.keys(memory.programConsultations).length + 1).padStart(4, "0")}`;
    return memory.language === "en" ? `I generated an **exclusively simulated** enrollment: **${id}**. It does not create a student record, reserve a place, or have academic validity.` : memory.language === "pt" ? `Gerei uma matrícula **exclusivamente simulada**: **${id}**. Ela não cria um aluno, não reserva vaga e não tem validade acadêmica.` : `Generé una posible matrícula **exclusivamente simulada**: **${id}**. No crea un estudiante, no reserva cupo y no tiene validez académica.`;
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
- Requirements: simulated application form; simulated academic documents
- Application: review program record -> complete demo form -> review and submit -> receive simulated admission result
- Enrollment: accept simulated place -> review demo tuition -> open non-functional payment link -> confirm simulated enrollment
- Before studying: check simulated calendar -> review welcome guide -> select demonstration courses -> start on simulated date
- Admissions availability: ${simulation.advisorOnline ? "online" : "offline"}
- Payment URL, only if explicitly requested: https://pagos.demo.invalid/uniandes (non-functional)
These values are invented for this prototype and are not official Universidad de los Andes information.`;
}

function localAiContextReply(memory: SessionMemory, simulation: SimulationControls) {
  const program = currentProgram(memory);
  const selected = program ? ` **${program}**` : (memory.language === "en" ? " the program you choose" : memory.language === "pt" ? " o curso que você escolher" : " el programa que elijas");
  const role = memory.advisorMode
    ? (memory.language === "en" ? "simulated Admissions advisor" : memory.language === "pt" ? "assessor simulado de Admissões" : "asesor simulado de Admisiones")
    : (memory.language === "en" ? "admissions bot" : memory.language === "pt" ? "bot de admissões" : "bot de admisiones");
  if (memory.language === "en") return `As the ${role}, I can continue with${selected}. The prototype uses simulated requirements (application form and academic documents), a four-step application and enrollment process, and ${simulation.cohortOpen ? "an open 2027-1 cohort with a simulated COP 24,000,000 tuition" : "no open cohort or confirmed future date"}. What would you like me to explain?`;
  if (memory.language === "pt") return `Como ${role}, posso continuar com${selected}. O protótipo usa requisitos simulados (formulário e documentos acadêmicos), um processo de inscrição e matrícula em quatro etapas e ${simulation.cohortOpen ? "uma turma 2027-1 aberta, com valor simulado de COP 24.000.000" : "nenhuma turma aberta nem data futura confirmada"}. O que deseja que eu explique?`;
  return `Como ${role}, puedo continuar con${selected}. El prototipo usa requisitos simulados (formulario y documentos académicos), un proceso de inscripción y matrícula de cuatro pasos y ${simulation.cohortOpen ? "una cohorte 2027-1 abierta, con valor simulado de COP 24.000.000" : "ninguna cohorte abierta ni fecha futura confirmada"}. ¿Qué deseas que te explique?`;
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
Maintain the selected program and facts across turns. Answer only questions about programs, cohorts, requirements, admissions, registration, enrollment, tuition, simulated payments, or Admissions contact. Explicitly call important academic values simulated or demonstrative. Never add real university facts, links, people, policies, dates, prices, promises, or admission decisions. Do not request identity documents or sensitive data. If no program is selected and the answer depends on one, ask which program. If information is absent, say it is not available in the simulation. Be natural, concise, and helpful; do not repeat the whole disclaimer in every sentence.` },
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
    const reply = responseLanguage === "en" ? "We are experiencing technical difficulties. You can try again now, come back later, or use the alternative demo contacts: **+57 601 555 0100** and **admisiones.demo@example.invalid**." : responseLanguage === "pt" ? "Estamos enfrentando dificuldades técnicas. Você pode tentar novamente agora, voltar mais tarde ou usar os contatos alternativos de demonstração: **+57 601 555 0100** e **admisiones.demo@example.invalid**." : "Estamos presentando dificultades técnicas. Puedes reintentar ahora, volver más tarde o comunicarte mediante nuestros contactos alternativos de demostración: **+57 601 555 0100** y **admisiones.demo@example.invalid**.";
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
      const reply = await naturalize(local.reply, responseLanguage, memory.advisorMode).catch(() => local.reply);
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
