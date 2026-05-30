# Spielerschutz & Sozialkonzept – Schulungsplattform

Webbasierte MVP-Schulung für Spielhallenaufsichten mit Online-Kurs, Abschlusstest (15 Fragen, 80 % Bestehensgrenze), PDF-Zertifikat und QR-Verifikation.

## Technologie

- **Frontend:** Next.js 16, React, Tailwind CSS
- **Backend:** Next.js API Routes
- **Datenbank:** SQLite (`data/app.db`)
- **Auth:** E-Mail/Passwort, Session-Cookies (iron-session)
- **PDF:** pdfkit (serverseitig)
- **QR-Code:** Verlinkung auf `/verify/[token]`

## Start

```bash
cd sozialkonzept-spielhalle
cp .env.example .env.local   # optional
npm install
npm run dev
```

Öffnen: [http://localhost:3000](http://localhost:3000)

## Demo-Zugänge

| Rolle       | E-Mail                    | Passwort  |
|------------|---------------------------|-----------|
| Admin      | admin@spielhalle.local    | admin123  |
| Mitarbeiter| mitarbeiter@demo.de       | demo123   |

## Funktionen

### Mitarbeiter
- Anmelden, 7 Module durcharbeiten, Fortschrittsanzeige
- Abschlusstest (Single/Multiple Choice, Wahr/Falsch, Praxisfälle)
- Bei Bestehen: PDF-Zertifikat mit QR-Code herunterladen
- Bei Nichtbestehen: Schulung wiederholen
- Optional: Fragen und Anregungen an die Leitung senden (`/schulung/feedback`)

### Admin
- Mitarbeiter anlegen, bearbeiten, deaktivieren
- **Kursinhalte:** Module, Lerninhalte pro Modul und Prüfungsfragen bearbeiten (`/dashboard/inhalte`)
- **PDF-Export:** Lerninhalte und Abschlusstest (mit Lösungen) für Behördennachweis
- **Rückmeldungen:** Fragen und Anregungen der Mitarbeitenden einsehen (`/dashboard/feedback`)
- Schulungsstatus mit Ampelsystem (Grün/Gelb/Rot)
- Zertifikate als PDF herunterladen
- CSV-Export für Behörden

### Öffentlich
- `/verify/[token]` – Zertifikatsprüfung per QR-Code

## Kursinhalte anpassen

Alle Inhalte und Prüfungsfragen liegen zentral in:

```
data/course.json
```

Nach Änderungen den Dev-Server neu starten.

## Zertifikatsnummer

Format: `SK-YYYY-000001` (z. B. `SK-2026-000123`)

## Produktion

- `SESSION_SECRET` setzen (mind. 32 Zeichen)
- `APP_URL` auf die öffentliche Domain setzen (für QR-Codes)
- `npm run build && npm start`

## Datenschutz (MVP)

- Keine Gesprächsinhalte gespeichert
- Passwörter mit bcrypt gehasht
- Admin-API nur für Rolle `admin`
- Prüfungsantworten nur als JSON bei Versuchen, keine sensiblen Gastdaten
