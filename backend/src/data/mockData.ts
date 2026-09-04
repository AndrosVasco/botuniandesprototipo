import type { InterestRecord, Program } from "../types/domain.js";

const programs: Program[] = [
  {
    id: "systems",
    name: "Ingeniería de Sistemas",
    cohortOpen: true,
    period: "2027-1",
    deadline: "30 de noviembre de 2026",
    requirements: ["Formulario de inscripción", "Resultado de admisión", "Documentos académicos"],
    applicationSteps: ["Revisar la información del programa", "Completar el formulario de inscripción", "Confirmar los datos antes de enviar", "Recibir el resultado de admisión"],
    enrollmentSteps: ["Aceptar el cupo", "Revisar el valor de la matrícula", "Abrir el enlace de pago", "Confirmar la matrícula"],
    studyStartSteps: ["Consultar el calendario académico", "Revisar la guía de bienvenida", "Seleccionar materias", "Iniciar clases en la fecha programada"],
    costCop: 24500000,
    source: "Ficha académica del programa",
    status: "Admisiones abiertas"
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
    source: "Ficha académica del programa",
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
    source: "Ficha académica del programa",
    status: "Información incompleta"
  }
];

export const db: { programs: Program[]; interests: InterestRecord[]; advisorAvailable: boolean } = {
  programs,
  interests: [],
  advisorAvailable: true
};
