import type { Program } from "../types/domain.js";

export interface Action { label: string; message: string; variant?: "primary" | "secondary"; }
export type MessageUi =
  | { type: "program-card"; program: Program; actions: Action[] }
  | { type: "actions"; actions: Action[] }
  | null;

export function createProgramCard(program: Program, actions: Action[]): MessageUi { return { type: "program-card", program, actions }; }
export function createActions(actions: Action[]): MessageUi { return { type: "actions", actions }; }

