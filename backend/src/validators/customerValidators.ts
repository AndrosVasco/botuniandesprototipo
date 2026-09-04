import { z } from "zod";

export const emailSchema = z.string().trim().email();
export const phoneSchema = z.string().trim().refine((value) => {
  if (!/^\+?[0-9\s()\-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
});

export function validateContact(channel: "email" | "whatsapp" | "call", value: string) {
  return channel === "email" ? emailSchema.safeParse(value).success : phoneSchema.safeParse(value).success;
}
