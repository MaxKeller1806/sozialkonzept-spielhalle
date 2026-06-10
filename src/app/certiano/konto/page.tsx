"use client";

import { useCallback, useEffect, useState } from "react";
import { clearSessionUserCache } from "@/components/account-menu";
import { CertianoShell } from "@/components/certiano-shell";
import { Button, Card, ErrorMessage, Input } from "@/components/ui";
import { fetchAuthMe } from "@/lib/auth-client";

interface SuperuserProfile {
  firstName: string;
  lastName: string;
  email: string;
}

export default function CertianoKontoPage() {
  const [profile, setProfile] = useState<SuperuserProfile | null>(null);
  const [profileForm, setProfileForm] = useState({ firstName: "", lastName: "" });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [mustChange, setMustChange] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);

  const loadPage = useCallback(() => {
    setLoading(true);
    setServiceError(null);
    fetchAuthMe()
      .then((auth) => {
        if (auth.status === "unavailable") {
          setServiceError(auth.message);
          return null;
        }
        if (auth.status !== "ok" || auth.user.role !== "superuser") {
          window.location.replace(
            auth.status === "ok"
              ? (auth.authState?.redirect ?? "/login")
              : "/certiano/login"
          );
          return null;
        }
        setMustChange(!!auth.user.mustChangePassword);
        return fetch("/api/superuser/profile");
      })
      .then(async (r) => {
        if (!r) return null;
        const data = await r.json().catch(() => ({}));
        if (r.status === 401 || r.status === 403) {
          window.location.replace("/certiano/login");
          return null;
        }
        if (!r.ok) {
          throw new Error(data.error ?? "Profil konnte nicht geladen werden.");
        }
        return data;
      })
      .then((d) => {
        if (!d?.profile) return;
        setProfile(d.profile);
        setProfileForm({
          firstName: d.profile.firstName,
          lastName: d.profile.lastName,
        });
      })
      .catch(() => {
        window.location.replace("/certiano/login");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError("");
    setProfileMessage("");
    setSavingProfile(true);

    const res = await fetch("/api/superuser/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileForm),
    });
    const data = await res.json().catch(() => ({}));
    setSavingProfile(false);

    if (!res.ok) {
      setProfileError(data.error ?? "Speichern fehlgeschlagen.");
      return;
    }

    if (data.profile) {
      setProfile(data.profile);
      setProfileForm({
        firstName: data.profile.firstName,
        lastName: data.profile.lastName,
      });
    }
    clearSessionUserCache();
    setProfileMessage("Profil gespeichert.");
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (!password || !passwordConfirm) {
      setPasswordError("Bitte neues Passwort zweimal eingeben.");
      return;
    }
    if (password !== passwordConfirm) {
      setPasswordError("Die neuen Passwörter stimmen nicht überein.");
      return;
    }
    if (password.length < 8) {
      setPasswordError("Das Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }
    if (!mustChange && !currentPassword) {
      setPasswordError("Bitte aktuelles Passwort eingeben.");
      return;
    }

    setSavingPassword(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password,
        passwordConfirm,
        currentPassword: mustChange ? undefined : currentPassword,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSavingPassword(false);

    if (!res.ok) {
      setPasswordError(data.error ?? "Passwortänderung fehlgeschlagen.");
      return;
    }

    setPassword("");
    setPasswordConfirm("");
    setCurrentPassword("");
    setMustChange(false);
    setPasswordMessage("Passwort wurde geändert.");
  }

  async function logout() {
    clearSessionUserCache();
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.replace("/certiano/login");
  }

  if (serviceError) {
    return (
      <CertianoShell>
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-slate-600">{serviceError}</p>
          <Button type="button" onClick={loadPage}>
            Erneut versuchen
          </Button>
        </div>
      </CertianoShell>
    );
  }

  if (loading || !profile) {
    return (
      <CertianoShell>
        <p className="text-sm text-slate-600">Lädt Konto…</p>
      </CertianoShell>
    );
  }

  return (
    <CertianoShell>
      <h2 className="mb-6 text-xl font-bold text-slate-900">Mein Konto</h2>

      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <h3 className="text-lg font-bold">Profil</h3>
          <p className="mt-2 text-sm text-slate-600">
            Ihre persönlichen Zugangsdaten im Certiano-Bereich.
          </p>
          {profileMessage && (
            <p className="mt-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
              {profileMessage}
            </p>
          )}
          <form onSubmit={saveProfile} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Vorname"
              required
              value={profileForm.firstName}
              onChange={(e) =>
                setProfileForm({ ...profileForm, firstName: e.target.value })
              }
              autoComplete="given-name"
            />
            <Input
              label="Nachname"
              required
              value={profileForm.lastName}
              onChange={(e) =>
                setProfileForm({ ...profileForm, lastName: e.target.value })
              }
              autoComplete="family-name"
            />
            <div className="sm:col-span-2">
              <Input
                label="E-Mail"
                type="email"
                value={profile.email}
                readOnly
                disabled
                autoComplete="username"
              />
            </div>
            <div className="sm:col-span-2">
              <ErrorMessage message={profileError} />
              <Button type="submit" disabled={savingProfile} className="!w-auto">
                {savingProfile ? "Speichern…" : "Profil speichern"}
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <h3 className="text-lg font-bold">Passwort ändern</h3>
          <p className="mt-2 text-sm text-slate-600">
            {mustChange
              ? "Bitte setzen Sie ein neues persönliches Passwort (mindestens 8 Zeichen)."
              : "Zur Bestätigung ist Ihr aktuelles Passwort erforderlich."}
          </p>
          {passwordMessage && (
            <p className="mt-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
              {passwordMessage}
            </p>
          )}
          <form onSubmit={submitPassword} className="mt-4 grid gap-4">
            {!mustChange && (
              <Input
                label="Aktuelles Passwort"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            )}
            <Input
              label="Neues Passwort"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <Input
              label="Neues Passwort wiederholen"
              type="password"
              required
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              autoComplete="new-password"
            />
            <ErrorMessage message={passwordError} />
            <Button type="submit" disabled={savingPassword} className="!w-auto">
              {savingPassword ? "Speichern…" : "Passwort speichern"}
            </Button>
          </form>
        </Card>

        <Card>
          <h3 className="text-lg font-bold">Abmelden</h3>
          <p className="mt-2 text-sm text-slate-600">
            Sitzung im Certiano-Bereich beenden.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4 !w-auto"
            onClick={logout}
          >
            Abmelden
          </Button>
        </Card>
      </div>
    </CertianoShell>
  );
}
