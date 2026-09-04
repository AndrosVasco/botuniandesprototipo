import type { InterestRecord, Program } from "../types/domain.js";

const programs: Program[] = [
  {
    id: "systems",
    name: "Ingeniería de Sistemas",
    cohortOpen: true,
    period: "2027-1",
    deadline: "30 de noviembre de 2026 (simulada)",
    requirements: ["Formulario de inscripción", "Resultado de admisión", "Documentos académicos simulados"],
    applicationSteps: ["Revisar la ficha simulada del programa", "Completar el formulario demostrativo", "Confirmar los datos antes de enviar", "Recibir el resultado simulado de admisión"],
    enrollmentSteps: ["Aceptar el cupo simulado", "Revisar el valor demostrativo", "Abrir el enlace de pago no funcional", "Confirmar la matrícula simulada"],
    studyStartSteps: ["Consultar el calendario simulado", "Revisar la guía de bienvenida", "Seleccionar materias de demostración", "Iniciar clases en la fecha simulada"],
    costCop: 24500000,
    source: "Ficha académica simulada",
    status: "Vigente para el prototipo"
  },
  {
    id: "design",
    name: "Diseño",
    cohortOpen: false,
    period: null,
    deadline: null,
    requirements: null,
    applicationSteps: null,
    enrollmentSteps: null,
    studyStartSteps: null,
    costCop: null,
    source: "Ficha académica simulada",
    status: "Sin cohorte abierta ni fecha futura confirmada"
  },
  {
    id: "special",
    name: "Programa Especial",
    cohortOpen: null,
    period: null,
    deadline: null,
    requirements: null,
    applicationSteps: null,
    enrollmentSteps: null,
    studyStartSteps: null,
    costCop: null,
    source: "Ficha académica simulada",
    status: "Información incompleta"
  }
];

export const db: { programs: Program[]; interests: InterestRecord[]; advisorAvailable: boolean } = {
  programs,
  interests: [],
  advisorAvailable: true
};
