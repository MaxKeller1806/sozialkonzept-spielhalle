import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { ensureSeeded, getSql } from "./db";
import { mapUserWithPassword } from "./db/row-mappers";
import type { SessionUser, User, UserRole } from "./types";

export interface SessionData {
  user?: SessionUser;
}

const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ??
    "dev-secret-min-32-chars-long-change-in-production!!",
  cookieName: "sk_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  return session.user ?? null;
}

export async function requireUser(role?: UserRole): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  if (role && user.role !== role) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export async function getUserByEmail(
  email: string
): Promise<(User & { passwordHash: string }) | undefined> {
  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM users WHERE LOWER(email) = ${email.trim().toLowerCase()} LIMIT 1
  `;
  const row = rows[0];
  return row ? mapUserWithPassword(row as Record<string, unknown>) : undefined;
}

export function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}
