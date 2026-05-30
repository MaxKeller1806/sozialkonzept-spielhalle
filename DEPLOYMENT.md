# Deployment: GitHub, Supabase & Vercel

Schritt-für-Schritt-Anleitung für die Schulungsplattform **Sozialkonzept Spielhalle**.

## Voraussetzungen

- GitHub-Konto
- [Supabase](https://supabase.com)-Konto (Free Tier reicht für den Start)
- [Vercel](https://vercel.com)-Konto
- Node.js 20+ lokal (für Migration/Seed)

---

## 1. GitHub

### 1.1 Repository anlegen

```bash
cd sozialkonzept-spielhalle
git init
git add .
git commit -m "Initial commit: Schulungsplattform"
```

Auf GitHub ein neues **privates** Repository erstellen, dann:

```bash
git remote add origin https://github.com/IHR-ORG/sozialkonzept-spielhalle.git
git branch -M main
git push -u origin main
```

### 1.2 Was nicht ins Repo gehört

- `.env.local` (lokale Secrets)
- `data/app.db` (alte SQLite-Datei, nicht mehr benötigt)

Diese Einträge stehen bereits in `.gitignore`.

---

## 2. Supabase (Datenbank)

### 2.1 Projekt erstellen

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Region wählen (z. B. **Frankfurt / eu-central-1**)
3. Datenbank-Passwort sicher notieren

### 2.2 Schema anwenden

**Option A – SQL Editor (empfohlen für den Einstieg)**

1. Supabase → **SQL Editor** → **New query**
2. Inhalt von `supabase/migrations/20260301000000_initial_schema.sql` einfügen
3. **Run** ausführen

**Option B – CLI lokal**

```bash
cp .env.example .env.local
# DATABASE_URL auf Direct connection (Port 5432) setzen

npm install
npm run db:migrate
npm run db:seed
```

### 2.3 Connection Strings kopieren

Supabase → **Project Settings** → **Database**:

| Verwendung | Typ | Port |
|------------|-----|------|
| Vercel / App (Runtime) | **Transaction pooler** | 6543 |
| Migration lokal | **Direct connection** | 5432 |

Für `DATABASE_URL` in Vercel immer den **Transaction pooler**-String verwenden (`?pgbouncer=true` falls angeboten).

### 2.4 Demo-Daten (optional)

Nach der Migration:

```bash
npm run db:seed
```

Legt Kurs-Metadaten und Demo-Zugänge an:

- Admin: `admin@spielhalle.local` / `admin123`
- Mitarbeiter: `mitarbeiter@demo.de` / `demo123`

**In Produktion:** Demo-Passwörter ändern oder Demo-User löschen.

---

## 3. Vercel

### 3.1 Projekt importieren

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository**
2. GitHub-Repo `sozialkonzept-spielhalle` auswählen
3. Framework: **Next.js** (automatisch erkannt)

### 3.2 Umgebungsvariablen setzen

Vercel → Projekt → **Settings** → **Environment Variables**:

| Variable | Wert | Environments |
|----------|------|--------------|
| `DATABASE_URL` | Supabase Transaction pooler URI | Production, Preview |
| `SESSION_SECRET` | Zufallsstring ≥ 32 Zeichen | Production, Preview |
| `APP_URL` | `https://ihr-projekt.vercel.app` | Production |
| `NODE_ENV` | `production` | Production |

`APP_URL` nach dem ersten Deploy auf die tatsächliche Vercel-URL setzen (wichtig für Zertifikat-QR-Codes).

Lokal:

```bash
cp .env.example .env.local
# Werte eintragen
npm run dev
```

### 3.3 Deploy

```bash
git push origin main
```

Vercel baut und deployed automatisch. Erster Build dauert ca. 2–3 Minuten.

### 3.4 Nach dem Deploy prüfen

1. `/login` – Anmeldung mit Demo-User
2. `/schulung` – Schulungsablauf
3. `/verify/[token]` – Zertifikatsprüfung (nach bestandenem Test)

---

## 4. Checkliste Produktion

- [ ] `SESSION_SECRET` ist ein einzigartiger, langer Zufallswert
- [ ] `APP_URL` zeigt auf die produktive Vercel-Domain (mit `https://`)
- [ ] `DATABASE_URL` nutzt den Supabase **Pooler** (Port 6543)
- [ ] SQL-Migration wurde ausgeführt
- [ ] Demo-Passwörter geändert oder Demo-User entfernt
- [ ] Vercel-Deployment erfolgreich (Build-Logs ohne Fehler)

---

## 5. Kursinhalte

Lerninhalte liegen in `data/course.json` (im Git-Repo). Änderungen über das Admin-UI (`/dashboard/inhalte`) werden in diese Datei geschrieben.

**Hinweis:** Auf Vercel ist das Dateisystem bei Serverless-Funktionen **nicht persistent**. Kursänderungen im Admin-Bereich funktionieren lokal; für produktive Content-Pflege sollten Inhalte per Git deployed oder künftig in Supabase Storage/DB ausgelagert werden.

---

## 6. Hilfe bei Problemen

| Symptom | Lösung |
|---------|--------|
| `DATABASE_URL ist nicht gesetzt` | Env-Variable in Vercel prüfen, Redeploy |
| DB-Verbindungsfehler | Pooler-URL (6543), Passwort, IP-Allowlist in Supabase |
| Login schlägt fehl | `npm run db:seed` ausführen oder User in Supabase Table Editor prüfen |
| QR-Code falscher Link | `APP_URL` auf produktive Domain setzen, Redeploy |

Weitere Details: `.env.example`
