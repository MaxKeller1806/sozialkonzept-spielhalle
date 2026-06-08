import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getSql } from "./db";
import { mapUserWithPassword } from "./db/row-mappers";
import { getCompanyById } from "./tenant";
import { isLicenseValid } from "./license";
import { hasAcceptedCurrentPolicy } from "./privacy";
import type { AuthState, SessionUser, User, UserRole } from "./types";

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

export async function requireSuperuser(): Promise<SessionUser> {
  return requireUser("superuser");
}

export type TenantSessionUser = SessionUser & { companyId: number };

export async function requireAdmin(): Promise<TenantSessionUser> {
  const user = await requireUser("admin");
  if (!user.companyId) throw new Error("FORBIDDEN");
  return { ...user, companyId: user.companyId };
}

export async function requireEmployee(): Promise<TenantSessionUser> {
  const user = await requireUser("employee");
  if (!user.companyId) throw new Error("FORBIDDEN");
  return { ...user, companyId: user.companyId };
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Das Passwort muss mindestens 8 Zeichen lang sein.";
  }
  return null;
}

export async function getUserByEmail(
  email: string
): Promise<(User & { passwordHash: string }) | undefined> {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM users WHERE LOWER(email) = ${email.trim().toLowerCase()} LIMIT 1
  `;
  const row = rows[0];
  return row ? mapUserWithPassword(row as Record<string, unknown>) : undefined;
}

export async function getUserById(
  id: number
): Promise<(User & { passwordHash: string }) | undefined> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
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
    companyId: user.companyId,
    mustChangePassword: !!user.mustChangePassword,
  };
}

export async function getAuthState(user: SessionUser): Promise<AuthState> {
  console.log(
    "[auth] rolle:",
    user.role,
    "company_id:",
    user.companyId,
    "must_change_password:",
    user.mustChangePassword
  );

  if (user.role === "superuser") {
    console.log("[auth] Redirect-Ziel: /certiano");
    return {
      mustChangePassword: user.mustChangePassword,
      privacyAccepted: true,
      companyActive: true,
      licenseActive: true,
      redirect: "/certiano",
    };
  }

  if (user.mustChangePassword) {
    console.log("[auth] Redirect-Ziel: /passwort-aendern");
    return {
      mustChangePassword: true,
      privacyAccepted: false,
      companyActive: false,
      licenseActive: false,
      redirect: "/passwort-aendern",
    };
  }

  if (!user.companyId) {
    console.error("[auth] Keine company_id für Rolle:", user.role);
    return {
      mustChangePassword: false,
      privacyAccepted: false,
      companyActive: false,
      licenseActive: false,
      redirect: undefined,
    };
  }

  const privacyAccepted = await hasAcceptedCurrentPolicy(user.id);
  console.log(
    "[auth] privacy_accepted:",
    privacyAccepted,
    "redirect target:",
    privacyAccepted ? "(pending company check)" : "/datenschutz/bestaetigen"
  );
  if (!privacyAccepted) {
    console.log("[auth] Redirect-Ziel: /datenschutz/bestaetigen");
    return {
      mustChangePassword: false,
      privacyAccepted: false,
      companyActive: false,
      licenseActive: false,
      redirect: "/datenschutz/bestaetigen",
    };
  }

  const company = await getCompanyById(user.companyId);
  if (!company) {
    return {
      mustChangePassword: false,
      privacyAccepted: true,
      companyActive: false,
      licenseActive: false,
      redirect: "/login",
    };
  }

  const companyActive = company.status === "active";
  const licenseActive =
    user.role === "admin"
      ? isLicenseValid(company.licenseStatus, company.licenseExpiresAt)
      : companyActive &&
        isLicenseValid(company.licenseStatus, company.licenseExpiresAt);

  let redirect: string | undefined;
  if (user.role === "admin") {
    if (!licenseActive && company.licenseStatus === "unlicensed") {
      redirect = "/dashboard/lizenz";
    } else if (!companyActive || !licenseActive) {
      redirect = "/dashboard/gesperrt";
    } else {
      redirect = "/dashboard/uebersicht";
    }
  } else {
    if (!companyActive || !licenseActive) {
      redirect = "/schulung/gesperrt";
    } else {
      redirect = "/schulung";
    }
  }

  console.log("[auth] redirect target:", redirect);

  return {
    mustChangePassword: false,
    privacyAccepted: true,
    companyActive,
    licenseActive,
    redirect,
  };
}

export function defaultRedirectForRole(role: UserRole): string {
  if (role === "superuser") return "/certiano";
  if (role === "admin") return "/dashboard/uebersicht";
  return "/schulung";
}
