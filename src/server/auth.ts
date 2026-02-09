import { getCloudflareContext } from "@opennextjs/cloudflare";

const DEFAULT_PBKDF2_ITERATIONS = 250_000;
const DEFAULT_SESSION_TTL_DAYS = 30;
const PASSWORD_MIN_LENGTH = 12;
const SESSION_COOKIE_NAME = "__Host-session";
const DEV_SESSION_COOKIE_NAME = "session";
const HASH_PREFIX = "pbkdf2$sha256$";

const textEncoder = new TextEncoder();

export type D1PreparedStatement = {
  bind: (...args: unknown[]) => D1PreparedStatement;
  first: <T = Record<string, unknown>>(columnName?: string) => Promise<T | null>;
  run: () => Promise<{ success: boolean }>;
  all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>;
};

export type D1Database = {
  prepare: (query: string) => D1PreparedStatement;
};

type AuthEnv = {
  DB: D1Database;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  PBKDF2_ITERATIONS?: string;
  SESSION_TTL_DAYS?: string;
};

type UserRow = {
  id: string;
  email: string;
  password_hash: string | null;
  role: "admin" | "user";
};

type SessionRow = {
  session_id: string;
  user_id: string;
  email: string;
  role: "admin" | "user";
  expires_at: string;
};

export type AuthUser = {
  id: string;
  email: string;
  role: "admin" | "user";
};

export type AuthSession = {
  user: AuthUser;
  expiresAt: string;
};

export function getPasswordMinLength() {
  return PASSWORD_MIN_LENGTH;
}

export function getSessionCookieName() {
  return isProduction() ? SESSION_COOKIE_NAME : DEV_SESSION_COOKIE_NAME;
}

export function getSessionTtlDays(env?: AuthEnv) {
  const raw = env?.SESSION_TTL_DAYS ?? "";
  const parsed = Number.parseInt(raw, 10);

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return DEFAULT_SESSION_TTL_DAYS;
}

export function getPbkdf2Iterations(env?: AuthEnv) {
  const raw = env?.PBKDF2_ITERATIONS ?? "";
  const parsed = Number.parseInt(raw, 10);

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return DEFAULT_PBKDF2_ITERATIONS;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function getAuthEnv(): Promise<AuthEnv> {
  const context = await getCloudflareContext({ async: true });
  const env = (context?.env ?? {}) as AuthEnv;

  return {
    ...env,
    ADMIN_EMAIL: env.ADMIN_EMAIL ?? process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: env.ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD,
    PBKDF2_ITERATIONS: env.PBKDF2_ITERATIONS ?? process.env.PBKDF2_ITERATIONS,
    SESSION_TTL_DAYS: env.SESSION_TTL_DAYS ?? process.env.SESSION_TTL_DAYS,
  };
}

export function getCookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((part) => part.trim());
  for (const cookie of cookies) {
    if (!cookie) continue;
    const [key, ...rest] = cookie.split("=");
    if (key === name) {
      return rest.join("=");
    }
  }

  return null;
}

export function setSessionCookie(response: { cookies: { set: (options: CookieOptions) => void } }, token: string, env?: AuthEnv) {
  response.cookies.set({
    name: getSessionCookieName(),
    value: token,
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: getSessionTtlDays(env) * 24 * 60 * 60,
  });
}

export function clearSessionCookie(response: { cookies: { set: (options: CookieOptions) => void } }) {
  response.cookies.set({
    name: getSessionCookieName(),
    value: "",
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

type CookieOptions = {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge: number;
};

export async function hashPassword(password: string, env?: AuthEnv) {
  const iterations = getPbkdf2Iterations(env);
  const salt = randomBytes(16);
  const hash = await pbkdf2(password, salt, iterations);

  return [HASH_PREFIX + iterations, base64UrlEncode(salt), base64UrlEncode(hash)].join("$");
}

export async function verifyPassword(password: string, storedHash: string) {
  if (!storedHash.startsWith(HASH_PREFIX)) {
    return false;
  }

  const parts = storedHash.split("$");
  if (parts.length !== 5) {
    return false;
  }

  const [, , iterationsRaw, saltRaw, hashRaw] = parts;
  const iterations = Number.parseInt(iterationsRaw, 10);
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false;
  }

  const salt = base64UrlDecode(saltRaw);
  const expectedHash = base64UrlDecode(hashRaw);
  const actualHash = await pbkdf2(password, salt, iterations);

  return timingSafeEqual(actualHash, expectedHash);
}

export async function ensureAdminBootstrap(db: D1Database, env: AuthEnv) {
  const countRow = await db.prepare("SELECT COUNT(*) as count FROM users").first<{ count: number }>();
  const count = Number(countRow?.count ?? 0);

  if (count > 0) {
    return;
  }

  const adminEmail = normalizeEmail(env.ADMIN_EMAIL ?? "");
  const adminPassword = env.ADMIN_PASSWORD ?? "";

  if (!adminEmail || adminPassword.length < PASSWORD_MIN_LENGTH) {
    throw new Error("Missing or weak admin credentials");
  }

  const passwordHash = await hashPassword(adminPassword, env);

  await db
    .prepare("INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)")
    .bind(createId(), adminEmail, passwordHash, "admin")
    .run();
}

export async function findUserByEmail(db: D1Database, email: string) {
  return db
    .prepare("SELECT id, email, password_hash, role FROM users WHERE email = ?")
    .bind(email)
    .first<UserRow>();
}

export async function createSession(db: D1Database, userId: string, env?: AuthEnv) {
  const token = createSessionToken();
  const tokenHash = await hashSessionToken(token);
  const expiresAt = new Date(Date.now() + getSessionTtlDays(env) * 24 * 60 * 60 * 1000).toISOString();

  await db
    .prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)")
    .bind(createId(), userId, tokenHash, expiresAt)
    .run();

  return { token, expiresAt };
}

export async function deleteSessionByToken(db: D1Database, token: string) {
  const tokenHash = await hashSessionToken(token);

  await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
}

export async function getSessionByToken(db: D1Database, token: string) {
  const tokenHash = await hashSessionToken(token);
  const session = await db
    .prepare(
      "SELECT sessions.id as session_id, sessions.user_id, sessions.expires_at, users.email, users.role FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ?"
    )
    .bind(tokenHash)
    .first<SessionRow>();

  if (!session) {
    return null;
  }

  if (Date.parse(session.expires_at) <= Date.now()) {
    await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
    return null;
  }

  return {
    user: {
      id: session.user_id,
      email: session.email,
      role: session.role,
    },
    expiresAt: session.expires_at,
  } satisfies AuthSession;
}

export async function hashSessionToken(token: string) {
  const digest = await subtleDigest(textEncoder.encode(token));
  return base64UrlEncode(new Uint8Array(digest));
}

export function createSessionToken() {
  return base64UrlEncode(randomBytes(32));
}

export function createId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return base64UrlEncode(randomBytes(16));
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }

  return diff === 0;
}

function randomBytes(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as any,
      iterations,
      hash: "SHA-256",
    },
    key,
    256
  );

  return new Uint8Array(bits);
}

async function subtleDigest(data: Uint8Array) {
  return crypto.subtle.digest("SHA-256", data as any);
}

function base64UrlEncode(bytes: Uint8Array) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  const base64 = typeof btoa === "function" ? btoa(binary) : Buffer.from(bytes).toString("base64");

  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = typeof atob === "function" ? atob(padded) : Buffer.from(padded, "base64").toString("binary");
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}
