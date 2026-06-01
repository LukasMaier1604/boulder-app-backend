# Boulder Hall – Backend API

Fastify + PostgreSQL + Prisma Backend für die Boulder Hall Demo App.

---

## Stack

- **Runtime:** Node.js 20+
- **Framework:** Fastify 4
- **Datenbank:** PostgreSQL (via Prisma ORM)
- **Auth:** JWT (via @fastify/jwt) + bcrypt
- **Sprache:** TypeScript
- **Hosting:** Railway

---

## Lokales Setup

### 1. Voraussetzungen

- Node.js 20+
- PostgreSQL lokal laufend **oder** Docker

### 2. Mit Docker (empfohlen für Entwicklung)

```bash
# PostgreSQL starten
docker run --name boulder-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=boulderwall \
  -p 5432:5432 \
  -d postgres:16
```

### 3. Abhängigkeiten installieren

```bash
npm install
```

### 4. Umgebungsvariablen anlegen

```bash
cp .env.example .env
```

Dann in `.env` anpassen:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/boulderwall"
JWT_SECRET="dein-geheimer-schluessel-mindestens-32-zeichen"
```

### 5. Datenbank initialisieren

```bash
# Schema in die DB pushen (Entwicklung)
npm run db:push

# Prisma Client generieren
npm run db:generate

# Testdaten einspielen
npm run db:seed
```

### 6. Server starten

```bash
npm run dev
```

Server läuft auf: `http://localhost:3000`

Health Check: `http://localhost:3000/health`

---

## API Übersicht

### Auth

| Methode | Pfad           | Beschreibung              | Auth |
|---------|----------------|---------------------------|------|
| POST    | /auth/register | Registrierung             | –    |
| POST    | /auth/login    | Login → JWT Token         | –    |
| GET     | /auth/me       | Eigenes Profil abrufen    | ✅   |

### Routen

| Methode | Pfad                        | Beschreibung                   | Auth  |
|---------|-----------------------------|--------------------------------|-------|
| GET     | /routes                     | Alle aktiven Routen            | User  |
| GET     | /routes/:id                 | Einzelne Route                 | User  |
| GET     | /routes/qr/:qrCode          | Route per QR-Code              | User  |
| POST    | /routes                     | Neue Route anlegen             | Admin |
| PATCH   | /routes/:id                 | Route bearbeiten               | Admin |
| DELETE  | /routes/:id                 | Route archivieren              | Admin |
| POST    | /routes/:id/regenerate-qr   | Neuen QR-Code generieren       | Admin |

### User / Tracking

| Methode | Pfad                       | Beschreibung                   | Auth |
|---------|----------------------------|--------------------------------|------|
| GET     | /users/me/stats            | Eigene Stats                   | User |
| GET     | /users/me/climbed          | Gekletterte Routen             | User |
| PATCH   | /users/me                  | Profil bearbeiten              | User |
| POST    | /users/me/attempts         | Attempt hinzufügen             | User |
| POST    | /users/me/top              | Route als geschafft markieren  | User |
| DELETE  | /users/me/attempts         | Attempts zurücksetzen          | User |
| POST    | /users/me/sessions         | Session starten                | User |
| PATCH   | /users/me/sessions/active  | Laufende Session beenden       | User |
| GET     | /users/leaderboard         | Leaderboard                    | User |

---

## Deployment auf Railway

### 1. Railway Projekt anlegen

1. [railway.app](https://railway.app) → New Project
2. "Deploy from GitHub repo" → dein Repository auswählen
3. PostgreSQL Plugin hinzufügen: "+ New" → "Database" → "PostgreSQL"

### 2. Umgebungsvariablen setzen

Im Railway Dashboard unter "Variables":

```
JWT_SECRET=<zufälliger langer String>
NODE_ENV=production
CORS_ORIGIN=*
```

`DATABASE_URL` wird von Railway automatisch gesetzt.

### 3. Build & Deploy

Railway erkennt `railway.toml` automatisch. Nach dem ersten Push:

```bash
# Lokales CLI (optional)
railway login
railway link
railway up
```

### 4. Seed auf Railway ausführen (einmalig)

```bash
railway run npm run db:seed
```

---

## Demo-Zugangsdaten (nach Seed)

| Rolle | E-Mail                   | Passwort   |
|-------|--------------------------|------------|
| Admin | admin@boulderwall.de     | admin1234  |
| User  | max@demo.de              | demo1234   |
| User  | lisa@demo.de             | demo1234   |
| User  | tom@demo.de              | demo1234   |
| User  | anna@demo.de             | demo1234   |
