export type Language = "es" | "en" | "pt";
export interface Action { label: string; message: string; variant?: "primary" | "secondary"; }
export interface ProgramCard { id: string; name: string; cohortOpen: boolean | null; period: string | null; deadline: string | null; requirements: string[] | null; costCop: number | null; source: string; status: string; }
export type MessageUi = { type: "program-card"; program: ProgramCard; actions: Action[] } | { type: "actions"; actions: Action[] } | null;
export interface ChatMessage { id: string; role: "user" | "assistant"; content: string; toolUsed?: string | null; ui?: MessageUi; }

