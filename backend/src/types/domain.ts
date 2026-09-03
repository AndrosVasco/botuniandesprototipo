export type Language = "es" | "en" | "pt";
export type ContactChannel = "email" | "whatsapp" | "call";

export interface Program {
  id: string;
  name: string;
  cohortOpen: boolean | null;
  period: string | null;
  deadline: string | null;
  requirements: string[] | null;
  costCop: number | null;
  source: string;
  status: string;
}

export interface InterestRecord {
  id: string;
  programId: string | null;
  channel: ContactChannel;
  contact: string;
  consent: true;
  kind: "interest" | "advisor-contact";
  status: "simulated" | "cancelled";
  internalChannel: "web";
  internalFlow: "aspirantes";
}

export type ConversationStep =
  | "idle"
  | "choose_interest_channel"
  | "await_interest_contact"
  | "await_interest_consent"
  | "confirm_interest"
  | "choose_advisor_channel"
  | "await_advisor_contact"
  | "await_advisor_consent"
  | "confirm_advisor_contact"
  | "correct_contact";

export interface SessionMemory {
  language: Language;
  internalChannel: "web";
  internalFlow: "aspirantes";
  step: ConversationStep;
  programId: string | null;
  channel: ContactChannel | null;
  contact: string | null;
  consent: boolean | null;
  correctionTarget: "interest" | "advisor" | null;
  lastRecordId: string | null;
  historySummary: string;
  useLocalFallback: boolean;
  advisorMode: boolean;
  currentProgramName: string | null;
  programConsultations: Record<string, number>;
}

export interface ChatMessage { role: "user" | "assistant"; content: string; }
