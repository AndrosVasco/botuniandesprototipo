import { createHmac, timingSafeEqual } from "node:crypto";

export interface AccessClaims { exp: number; ai: boolean; }
const SESSION_MS = 5 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function secret() { return process.env.AUTH_SECRET ?? ""; }
function encode(value: string) { return Buffer.from(value).toString("base64url"); }
function sign(payload: string) { return createHmac("sha256", secret()).update(payload).digest("base64url"); }
function safeEqual(left: string, right: string) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function authConfigured() { return Boolean(secret() && process.env.APP_ACCESS_CODE && process.env.AI_ACCESS_CODE); }
export function validateCode(kind: "app" | "ai", code: string) {
  const expected = kind === "app" ? process.env.APP_ACCESS_CODE ?? "" : process.env.AI_ACCESS_CODE ?? "";
  return expected.length >= 8 && safeEqual(code, expected);
}
export function allowAttempt(key: string) {
  const now = Date.now(); const current = attempts.get(key);
  if (!current || current.resetAt <= now) { attempts.set(key, { count: 1, resetAt: now + 60_000 }); return true; }
  current.count += 1;
  return current.count <= 8;
}
export function issueToken(ai = false, expiresAt = Date.now() + SESSION_MS) {
  const payload = encode(JSON.stringify({ exp: expiresAt, ai } satisfies AccessClaims));
  return { token: `${payload}.${sign(payload)}`, expiresAt };
}
export function verifyToken(token: string | undefined): AccessClaims | null {
  if (!token || !secret()) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra || !safeEqual(signature, sign(payload))) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AccessClaims;
    return typeof claims.exp === "number" && typeof claims.ai === "boolean" && claims.exp > Date.now() ? claims : null;
  } catch { return null; }
}
export function bearer(value: string | undefined) { return value?.startsWith("Bearer ") ? value.slice(7) : undefined; }

