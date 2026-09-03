import type { InterestRecord, Program } from "../types/domain.js";

const programs: Program[] = [
  {
    id: "systems",
    name: "Ingeniería de Sistemas",
    cohortOpen: true,
    period: "2027-1",
    deadline: "30 de noviembre de 2026 (simulada)",
    requirements: ["Formulario de inscripción", "Resultado de admisión", "Documentos académicos simulados"],
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

