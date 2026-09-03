import { z } from "zod";

export const emailSchema = z.string().trim().email();
export const phoneSchema = z.string().trim().regex(/^\+?[0-9][0-9\s-]{6,18}[0-9]$/);

export function validateContact(channel: "email" | "whatsapp" | "call", value: string) {
  return channel === "email" ? emailSchema.safeParse(value).success : phoneSchema.safeParse(value).success;
}

