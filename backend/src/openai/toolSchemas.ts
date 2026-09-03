import type OpenAI from "openai";

const programId = { type: "string", enum: ["systems", "design", "special"] } as const;
const channel = { type: "string", enum: ["email", "whatsapp", "call"] } as const;
export const openAITools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  { type: "function", function: { name: "consultProgram", description: "Consult one simulated admissions program.", parameters: { type: "object", properties: { programId }, required: ["programId"] } } },
  { type: "function", function: { name: "checkCohort", description: "Check simulated cohort availability.", parameters: { type: "object", properties: { programId }, required: ["programId"] } } },
  { type: "function", function: { name: "registerInterest", description: "Register simulated interest after explicit consent.", parameters: { type: "object", properties: { programId, channel, contact: { type: "string" }, consent: { type: "boolean" } }, required: ["programId", "channel", "contact", "consent"] } } },
  { type: "function", function: { name: "checkAdvisorAvailability", description: "Check simulated Admissions advisor availability.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "requestAdvisorContact", description: "Create a simulated Admissions contact request after explicit consent.", parameters: { type: "object", properties: { channel, contact: { type: "string" }, consent: { type: "boolean" } }, required: ["channel", "contact", "consent"] } } },
  { type: "function", function: { name: "cancelInterest", description: "Cancel a simulated interest record.", parameters: { type: "object", properties: { recordId: { type: "string" } }, required: ["recordId"] } } }
];

