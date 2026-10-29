# Doctor Tracker — Backend API

REST API for **Doctor Tracker**, a secure admin portal for managing doctors and their patients: CRUD, search/filter/sort/pagination, doctor–patient assignment, and dashboard analytics. Built with Express, Prisma and MongoDB Atlas; identity is delegated to Clerk.

---

## Elevator Pitch

Doctor Tracker gives a clinic admin one place to manage every doctor, every patient, and who is treating whom. This repository is the API behind that portal: a stateless Express service that verifies Clerk session tokens on every request, stores doctors, patients and their assignments in MongoDB Atlas through Prisma, and serves all list state — search, filters, sorting and pagination — from indexed database queries rather than in the browser. It also powers the dashboard: four live KPI counts, a patients-per-doctor ranking, and zero-filled 7/30/90-day activity timelines. The result is a small, auditable backend that a separately deployed Next.js client can consume over plain REST/JSON.

---

## Architecture

```
Browser
  │  (Clerk session cookie, same-origin to the Next.js app)
  ▼
Next.js client on Vercel
  │  Authorization: Bearer <Clerk session token>
  │  REST/JSON over HTTPS
  ▼
Express API on Render/Railway  ──verifyToken(CLERK_JWT_KEY)──►  Clerk
  │
  ▼
Prisma 6.x
  │
  ▼
MongoDB Atlas (replica set)
```

- **Separate deployments.** The Next.js client and this API are independent services; the browser never talks to the API directly. All calls happen in the client's server runtime with a fresh Clerk token.
- **Stateless auth.** Every protected request carries `Authorization: Bearer <Clerk session token>`. `@clerk/backend` verifies the RS256 signature against `CLERK_JWT_KEY`; `authorize('admin')` reads `publicMetadata.role` from the claims. There is no local users collection, password hash or seed script.
- **Database-side list state.** Search, filters, sorting and pagination map 1:1 to Prisma `where`/`orderBy`/`skip`/`take`, so the API never ships an unbounded collection to the client.
- **Three collections.** `doctors`, `patients`, and `doctorpatients` (the assignment mapping, unique per patient).

### Tech stack

| Area | Choice |
|---|---|
| Runtime | Node.js 18+ (ES modules) |
| Framework | Express 4 |
| Database | MongoDB Atlas via Prisma 6.x |
| Validation | Zod |
| Auth | Clerk (`@clerk/backend` `verifyToken`) |
| Hardening | helmet, strict CORS allowlist, express-rate-limit |

### Repository layout

```
.
├── prisma/
│   └── schema.prisma          # Doctor, Patient, DoctorPatient + indexes
├── src/
│   ├── app.js                 # Express app: helmet, CORS, JSON limit, routers
│   ├── server.js              # startup, DB connect, graceful shutdown
│   ├── config/
│   │   ├── env.js             # env parsing + startup validation
│   │   └── db.js              # Prisma client singleton
│   ├── middleware/            # auth, validate, rate limit, error handling
│   ├── routes/                # /api router tree
│   ├── controllers/           # thin HTTP handlers (read req.validated)
│   ├── services/              # all Prisma queries and transactions
│   ├── validators/            # Zod schemas
│   └── utils/                 # ApiError, asyncHandler
├── .env.example
├── render.yaml                # Render blueprint
└── package.json
```

---

## Setup Guide

### Prerequisites

- **Node.js 18+** (Node 22 recommended; `render.yaml` pins 22)
- A **MongoDB Atlas** cluster (free tier is enough). Transactions require a replica set — Atlas works; a standalone local `mongod` does not unless started as a single-node replica set.
- A **Clerk** application (free tier):
  1. Enable the sign-in methods you want (Google and/or email + password).
  2. Create the admin user in the Clerk Dashboard.
  3. Set `publicMetadata: { "role": "admin" }` on that user.
  4. Add `publicMetadata` to the **session token template** (Sessions → Customize session token).
  5. Copy the **PEM public key** from API Keys.

### Local setup

```bash
git clone https://github.com/Utchash007/DoctorTracker-Backend.git
cd DoctorTracker-Backend
npm install

# Windows: copy .env.example .env
cp .env.example .env          # then fill in the values

npx prisma db push            # sync collections + indexes (MongoDB has no Prisma Migrate)
npx prisma generate           # typed client (postinstall also runs this)
npm run dev                   # http://localhost:5000
```

Check it:

```bash
curl http://localhost:5000/api/health
# {"data":{"status":"ok"}}
```

The server refuses to start when required env vars are missing or invalid (bad `DATABASE_URL` shape, non-RSA PEM, malformed CORS origin) and prints which variable failed.

### Environment variables

| Name | Required | Description |
|---|---|---|
| `NODE_ENV` | no | `development` (default), `test`, `production` |
| `PORT` | no | default `5000` |
| `DATABASE_URL` | **yes** | MongoDB Atlas connection string **including the database name**; must start with `mongodb://` or `mongodb+srv://` |
| `CLERK_JWT_KEY` | **yes** | Clerk PEM public key (RSA). Multi-line quoted value or single line with `\n` escapes — both are accepted and validated at startup |
| `CORS_ORIGIN` | no | Comma-separated allowed frontend origins. Each must be an exact `http(s)` origin: scheme + host + port, **no path and no trailing slash** (default `http://localhost:3000`) |

`.env.example` is the canonical template. No secrets are committed; `.env` is git-ignored.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | start with nodemon on `PORT` (default 5000) |
| `npm start` | start with plain Node (production) |
| `npm run db:push` | `prisma db push` — sync `schema.prisma` to Atlas |
| `npx prisma generate` | (re)generate the typed Prisma client |

### First request

```bash
# Replace with a real Clerk session token for an admin user
curl -H "Authorization: Bearer $CLERK_SESSION_TOKEN" \
  http://localhost:5000/api/dashboard/summary
```

A missing/invalid token returns `401 UNAUTHORIZED`; a valid non-admin token returns `403 FORBIDDEN`.

---

## API

Base path: `/api`. Everything except `GET /api/health` requires `Authorization: Bearer <Clerk session token>` with `publicMetadata.role === "admin"`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness probe (public) |
| GET | `/doctors` | List doctors: `search`, `specialization`, `hospital`, `from`, `to`, `sort`, `page`, `limit` |
| GET | `/doctors/filters` | Distinct specializations + hospitals for filter dropdowns |
| POST | `/doctors` | Create doctor |
| GET | `/doctors/:id` | Get doctor |
| PATCH | `/doctors/:id` | Update doctor (partial) |
| DELETE | `/doctors/:id` | Delete doctor — `409` while they still have patients |
| GET | `/doctors/:id/patients` | A doctor's patients: `search`, `condition`, `page`, `limit`; items carry `assignedAt` |
| POST | `/doctors/:id/patients` | Create patient **and** assignment in one transaction |
| DELETE | `/doctors/:id/patients/:patientId` | Remove patient + assignment |
| GET | `/patients` | List patients with `doctor: { id, name }`: `search`, `condition`, `doctorId`, `from`, `to`, `sort`, `page`, `limit` |
| GET | `/patients/:id` | Get patient |
| PATCH | `/patients/:id` | Update patient (partial) |
| DELETE | `/patients/:id` | Delete patient and its assignment |
| GET | `/dashboard/summary` | `totalDoctors`, `totalPatients`, `newDoctorsThisWeek`, `newPatientsThisWeek` |
| GET | `/dashboard/patients-per-doctor` | Ranking `{ doctorId, name, specialization, patientCount }`, `limit` 1–50 (default 10) |
| GET | `/dashboard/timeline` | Zero-filled daily counts, `range=7d\|30d\|90d` (default `30d`) |

Pagination defaults: `page=1`, `limit=10` (max 50). Sort: `newest` (default), `oldest`, `name_asc`, `name_desc`. Date filters use `createdAt` with inclusive ISO `from`/`to`.

### Response envelope

Success:

```json
{ "data": { }, "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }
```

`meta` appears on paginated lists only.

Error:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Validation failed",
             "details": [{ "field": "email", "message": "Enter a valid email" }] } }
```

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR`, `BAD_REQUEST`, `INVALID_ID` | bad body/query/params, malformed JSON |
| 401 | `UNAUTHORIZED` | missing, invalid or expired Clerk token |
| 403 | `FORBIDDEN` | role not allowed, or request `Origin` not in the CORS allowlist |
| 404 | `NOT_FOUND` | unknown route or resource |
| 409 | `CONFLICT`, `DUPLICATE` | doctor still has patients; duplicate email |
| 413 | `PAYLOAD_TOO_LARGE` | JSON body over 100 kb |
| 429 | `TOO_MANY_REQUESTS` | more than 300 requests / 15 min / IP |
| 500 | `INTERNAL_ERROR` | unexpected error; details hidden in production |

Dashboard notes: the "this week" window starts **Monday 00:00 UTC**; timeline days are grouped and labelled in **UTC**. Patient and doctor timestamps are stored as BSON dates.

---

## Technical Decisions (deep dive)

### 1. A mapping collection with a unique `patientId`

**Context.** A patient belongs to exactly one doctor, a doctor has many patients, and the UI needs both "patients of this doctor" (newest first) and a patients-per-doctor ranking. Every patient is created under a doctor, and removing a patient removes the patient itself.

**Decision.** Keep the relationship in a dedicated `doctorpatients` collection with `{ doctorId, patientId, createdAt }`, and put a **unique index on `patientId`**. The patient document has no `doctorId`.

**Why.**
- The "one doctor per patient" invariant is enforced by the database, not by application code that could race.
- The assignment has its own `createdAt`, which is what the doctor's patient list exposes as `assignedAt`.
- `{ doctorId: 1, createdAt: 1, _id: 1 }` serves both the doctor's patient list and the `groupBy(doctorId)` used by the dashboard ranking (MongoDB scans it backwards for newest-first).
- Reassigning a patient later is a one-document update in the mapping collection — the patient record stays untouched.

**Tradeoffs.**
- Listing a doctor's patients with search/condition filters requires an `include`/`$lookup` join instead of a flat `where`.
- Creating a patient and its link touches two collections, so it runs inside `prisma.$transaction([...])`; a standalone MongoDB would fail here (Atlas is a replica set).
- At this scale a flattened `doctorId` on the patient would be simpler, but it loses `assignedAt` and makes the unique-per-patient rule an application concern.

**Rejected alternatives.** `doctorId` on `patients` (no assignment timestamp, move rewrites the patient); an array of patient ids on the doctor (unbounded document, no unique constraint per patient).

### 2. Delegating identity to Clerk

**Context.** The portal needs secure sign-in, protected routes and an admin role. Client and API are deployed on different origins, so cookie-based sessions cannot be shared across them. The API must stay stateless.

**Decision.** Clerk owns identity, sign-in, sessions and the admin role. The Express API verifies each request's Bearer token with `@clerk/backend` `verifyToken` against `CLERK_JWT_KEY`; `authorize('admin')` reads `publicMetadata.role` from the verified claims. There is no local `users` collection, no bcrypt, no refresh-token code and no admin seed.

**Why.**
- Password storage, reset flows, email verification, OAuth and session revocation are handled by a managed provider on a free tier that is effectively unlimited for an admin portal.
- Bearer tokens work cleanly across separate origins, so the API never needs cookies or a shared parent domain.
- Revocation is near-instant: a deleted/disabled user or a removed role stops working when the short-lived token expires (~60 s).
- The role lives in Clerk metadata, so promoting an admin is a dashboard change, not a database migration.

**Tradeoffs.**
- A managed dependency: if Clerk is unavailable, sign-in stops (existing tokens remain valid until expiry).
- The Clerk session token template must include `publicMetadata`, otherwise every valid user looks like a non-admin.
- Tokens expire quickly, so the Next.js server runtime must call `auth().getToken()` per request; caching a token server-side would produce 401s.
- Local testing needs signed test tokens or a Clerk development instance.

**Rejected alternatives.** Local JWT + bcrypt (more code, manual revocation, password reset and seeding); Auth0 (comparable, but a heavier Next.js integration for this scope).

---

## Hardening

- `helmet` security headers; `x-powered-by` disabled.
- Strict CORS allowlist from `CORS_ORIGIN`. Requests with a foreign `Origin` are rejected with `403 FORBIDDEN`; preflights are answered for allowed origins only.
- Global rate limit: **300 requests / 15 minutes / IP** on `/api`, with health checks and `OPTIONS` preflights exempt. `trust proxy` is enabled only in production.
- JSON bodies capped at **100 kb** (`413 PAYLOAD_TOO_LARGE`); malformed JSON maps to `400 BAD_REQUEST`.
- All input passes Zod validation (`body`, `query`, `params`); controllers read `req.validated`, never raw `req.body`/`req.query`.
- Query parsing is flat (`simple`), so nested query objects cannot smuggle operators into Prisma filters.
- No request headers, tokens, PEMs or connection strings are written to logs intentionally. Prisma connection failures log only the error class; unexpected 5xx errors are logged server-side while the response message is hidden in production.
- Unknown routes return a generic `404 NOT_FOUND` without echoing internals.
- Graceful shutdown on `SIGTERM`/`SIGINT`: stop accepting connections, close in-flight requests (10 s grace), disconnect Prisma.

### Indexes

Declared in `prisma/schema.prisma` and synced with `npx prisma db push`:

| Collection | Index | Serves |
|---|---|---|
| `doctors` | `{ email: 1 }` unique | duplicate-email prevention |
| `doctors` | `{ createdAt: 1, _id: 1 }` | default newest/oldest sort (scanned in reverse for `desc`) + date filters |
| `doctors` | `{ name: 1, _id: 1 }` | name sort + anchored prefix search |
| `doctors` | `{ specialization: 1, createdAt: 1, _id: 1 }` | specialization filter + stable date sort |
| `doctors` | `{ hospital: 1, createdAt: 1, _id: 1 }` | hospital filter + stable date sort |
| `patients` | `{ createdAt: 1, _id: 1 }` | default sort + date filters |
| `patients` | `{ name: 1, _id: 1 }` | name sort + anchored prefix search |
| `patients` | `{ condition: 1, createdAt: 1, _id: 1 }` | condition filter + stable date sort |
| `doctorpatients` | `{ patientId: 1 }` unique | one doctor per patient |
| `doctorpatients` | `{ doctorId: 1, createdAt: 1, _id: 1 }` | doctor's patient list + per-doctor counts |

Search is an anchored, case-insensitive prefix match (`startsWith`) — no text indexes are used, because `$text` only matches whole words and would miss partial terms like "card" → "Cardiologist". Every `orderBy` ends with `_id` so offset pagination stays stable when timestamps tie.

---

## Deployment

`render.yaml` is a ready blueprint (Node runtime, `npm ci`, `npm start`, health check `/api/health`, free plan). On Render: **New → Blueprint → select this repo**, then fill the three secret values (`DATABASE_URL`, `CLERK_JWT_KEY`, `CORS_ORIGIN`).

Manual equivalent (Render or Railway):

1. Create a Web Service from this repo; **root directory = repository root**.
2. Build command: `npm ci && npx prisma generate`. Start command: `npm start`.
3. Set `NODE_ENV=production` and the environment variables from the table above.
4. In Atlas → Network Access, allow the host's outbound IPs (or `0.0.0.0/0` for a demo).
5. Health check path: `/api/health`.
6. Set `CORS_ORIGIN` to the deployed frontend origin exactly (e.g. `https://doctor-tracker.vercel.app`), and `NEXT_PUBLIC_API_URL=https://<api-host>/api` on the frontend.
7. Run `npx prisma db push` once against the production database (or from a local shell pointed at the same `DATABASE_URL`).

Notes for evaluators:

- Free tiers sleep when idle; the first request after a pause can take 30+ seconds.
- MongoDB Atlas must be a replica set for `$transaction` (Atlas always is).
- `npm audit` reports three high-severity advisories in Prisma CLI's transitive `deepmerge-ts`. The only fix is Prisma 7, which has no MongoDB connector; Prisma 6.19.x is pinned deliberately and the advisory affects CLI tooling, not the running API.

---

## License

Assessment project — not licensed for redistribution.
