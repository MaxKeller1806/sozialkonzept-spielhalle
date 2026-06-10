"use client";

import type { AuthState, SessionUser } from "./types";

export const AUTH_SERVICE_UNAVAILABLE = "SERVICE_TEMPORARILY_UNAVAILABLE";

export type AuthMeResponse =
  | { status: "ok"; user: SessionUser; authState: AuthState }
  | { status: "unauthorized" }
  | { status: "unavailable"; message: string }
  | { status: "error" };

const DEFAULT_UNAVAILABLE_MESSAGE =
  "Die Verbindung zur Datenbank ist vorübergehend nicht verfügbar.";

export function isAuthServiceUnavailablePayload(
  data: unknown
): data is { error: typeof AUTH_SERVICE_UNAVAILABLE; message?: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { error?: string }).error === AUTH_SERVICE_UNAVAILABLE
  );
}

export function isAuthServiceUnavailableResponse(
  res: Response,
  data: unknown
): boolean {
  return res.status === 503 && isAuthServiceUnavailablePayload(data);
}

export async function fetchAuthMe(): Promise<AuthMeResponse> {
  try {
    const res = await fetch("/api/auth/me");
    let data: Record<string, unknown> = {};
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      /* leer */
    }

    if (isAuthServiceUnavailableResponse(res, data)) {
      return {
        status: "unavailable",
        message:
          typeof data.message === "string"
            ? data.message
            : DEFAULT_UNAVAILABLE_MESSAGE,
      };
    }

    if (res.status === 401 || !data.user) {
      return { status: "unauthorized" };
    }

    if (!res.ok) {
      return { status: "error" };
    }

    return {
      status: "ok",
      user: data.user as SessionUser,
      authState: (data.authState ?? {}) as AuthState,
    };
  } catch {
    return {
      status: "unavailable",
      message: "Verbindung zum Server fehlgeschlagen. Bitte erneut versuchen.",
    };
  }
}
