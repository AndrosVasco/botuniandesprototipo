import OpenAI from "openai";
export const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
export const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
