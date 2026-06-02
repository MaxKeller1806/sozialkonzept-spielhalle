"use client";

import { useEffect, useState } from "react";
import { AccountMenu } from "@/components/account-menu";
import { Button, Card, ErrorMessage, Input, LoadingStatus, PageMain } from "@/components/ui";
import { formatUserAddress } from "@/lib/user-profile";

interface EmployeeProfile {
  firstName: string;
  lastName: string;
  email: string;
  birthPlace: string | null;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
}

export default function KontoPage() {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [mustChange, setMustChange] = useState(false);
  const [profileForm, setProfileForm] = useState({
    birthPlace: "",
    street: "",
    houseNumber: "",
    postalCode: "",
    city: "",
  });
  const [error, setError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [message, setMessage] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d?.user) {
          window.location.replace("/login");
          return null;
        }
        if (d.user.role === "admin") {
          window.location.replace("/dashboard/konto");
          return null;
        }
        if (d.user.role === "superuser") {
          window.location.replace("/certiano/konto");
          return null;
        }
        setMustChange(!!d.user.mustChangePassword);
        return fetch("/api/auth/profile");
      })
      .then((r) => (r?.ok ? r.json() : null))
      .then((d) => {
        if (!d?.profile) return;
        setProfile(d.profile);
        setProfileForm({
          birthPlace: d.profile.birthPlace ?? "",
          street: d.profile.street ?? "",
          houseNumber: d.profile.houseNumber ?? "",
          postalCode: d.profile.postalCode ?? "",
          city: d.profile.city ?? "",
        });
        setLoading(false);
      })
      .catch(() => {
        window.location.replace("/login");
      });
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError("");
    setProfileMessage("");
    setSavingProfile(true);

    const res = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileForm),
    });
    const data = await res.json();
    setSavingProfile(false);

    if (!res.ok) {
      setProfileError(data.error ?? "Speichern fehlgeschlagen.");
      return;
    }

    if (data.profile) {
      setProfile(data.profile);
      setProfileForm({
        birthPlace: data.profile.birthPlace ?? "",
        street: data.profile.street ?? "",
        houseNumber: data.profile.houseNumber ?? "",
        postalCode: data.profile.postalCode ?? "",
        city: data.profile.city ?? "",
      });
    }
    setProfileMessage("Stammdaten gespeichert.");
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password,
        passwordConfirm,
        currentPassword: mustChange ? undefined : currentPassword,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Speichern fehlgeschlagen.");
      return;
    }

    setPassword("");
    setPasswordConfirm("");
    setCurrentPassword("");
    setMustChange(false);
    setMessage("Passwort gespeichert.");

    if (data.redirect && data.redirect !== "/passwort-aendern") {
      setTimeout(() => window.location.assign(data.redirect), 800);
    }
  }

  if (loading || !profile) return <LoadingStatus />;

  return (
    <div className="min-h-screen pb-16">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-4">
          <h1 className="text-lg font-bold text-slate-900">Mein Konto</h1>
          <AccountMenu />
        </div>
      </header>
      <PageMain className="mx-auto max-w-2xl px-4 py-8">
        <Card className="mb-6">
          <h2 className="text-lg font-bold">Profil</h2>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Vorname</dt>
              <dd className="font-medium">{profile.firstName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Nachname</dt>
              <dd className="font-medium">{profile.lastName}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">E-Mail</dt>
              <dd className="font-medium">{profile.email}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Anschrift</dt>
              <dd className="font-medium">{formatUserAddress(profile)}</dd>
            </div>
          </dl>
        </Card>

        <Card className="mb-6">
          <h2 className="text-lg font-bold">Stammdaten bearbeiten</h2>
          <p className="mt-2 text-sm text-slate-600">
            Geburtsort und Anschrift können Sie hier aktualisieren.
          </p>
          {profileMessage && (
            <p className="mt-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
              {profileMessage}
            </p>
          )}
          <form onSubmit={saveProfile} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Geburtsort"
              value={profileForm.birthPlace}
              onChange={(e) =>
                setProfileForm({ ...profileForm, birthPlace: e.target.value })
              }
            />
            <Input
              label="Straße"
              value={profileForm.street}
              onChange={(e) =>
                setProfileForm({ ...profileForm, street: e.target.value })
              }
            />
            <Input
              label="Hausnummer"
              value={profileForm.houseNumber}
              onChange={(e) =>
                setProfileForm({ ...profileForm, houseNumber: e.target.value })
              }
            />
            <Input
              label="Postleitzahl"
              value={profileForm.postalCode}
              onChange={(e) =>
                setProfileForm({ ...profileForm, postalCode: e.target.value })
              }
            />
            <Input
              label="Ort"
              value={profileForm.city}
              onChange={(e) =>
                setProfileForm({ ...profileForm, city: e.target.value })
              }
            />
            <div className="sm:col-span-2">
              <ErrorMessage message={profileError} />
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? "Speichern…" : "Stammdaten speichern"}
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="text-lg font-bold">Passwort ändern</h2>
          <p className="mt-2 text-sm text-slate-600">
            {mustChange
              ? "Bitte setzen Sie ein neues persönliches Passwort (mindestens 8 Zeichen)."
              : "Zur Bestätigung ist Ihr aktuelles Passwort erforderlich."}
          </p>
          {message && (
            <p className="mt-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
              {message}
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
            <ErrorMessage message={error} />
            <Button type="submit" disabled={saving}>
              {saving ? "Speichern…" : "Passwort speichern"}
            </Button>
          </form>
        </Card>
      </PageMain>
    </div>
  );
}
