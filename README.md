# Nonlinear Assessments

Clinical intake questionnaire with theme-based scoring and clinician review.

## Stack

- **Next.js 15** + TypeScript
- **Clerk** — clinician authentication
- **Prisma** + PostgreSQL
- **Anthropic Claude** (optional) — server-side report drafting
- Assessment module: `src/features/assessments/`

## Setup

### 1. Install and database

```bash
npm install
cp .env.example .env
# Set DATABASE_URL to your Postgres connection string, then:
npx prisma migrate dev --name init
```

### 2. Clerk (required for clinician routes)

1. Create an application at [clerk.com](https://dashboard.clerk.com)
2. Copy **Publishable key** and **Secret key** into `.env`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

3. In Clerk Dashboard → **Paths**, set:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in: `/dashboard`

### 3. Optional: LLM report drafting

Add a Gemini or Anthropic API key to `.env` (Gemini is tried first if both are set):

```env
GEMINI_API_KEY=AIza...
```

Get a free key at [Google AI Studio](https://aistudio.google.com/apikey).

Without a key, **Generate report** still works using a structured template draft.

### 4. Run

```bash
npm run dev
```

Open **http://localhost:3000**

## Who can access what

| Route | Auth |
|-------|------|
| `/intake/[token]` | Public — client assessment journey |
| `/api/intake/[token]` (PATCH) | Public — legacy screener autosave |
| `/api/intake/[token]/modules…` | Public — journey module load/save/submit |
| `/dashboard`, `/cases/*`, `/api/intake` (POST) | **Clerk** — clinicians only |
| `/dev/preview` | Public in **development** only — full UI preview |

## Flow

1. Clinician signs in → **Dashboard** (`/dashboard`)
2. **Create intake link** (optionally link to a **Client** record) → send `/intake/{token}`
3. Client accepts **consent** → completes questionnaire (auto-save) → submits
4. Clinician filters dashboard (awaiting client, ready to review, etc.) → **Review**
5. Adjust themes, generate report, **finalize** or **export**, **mark as reviewed**
6. **Activity log** on each case shows consent, saves, reports, and link actions

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production Postgres and email notifications.

## Dev preview (no Clerk)

In development, open **http://localhost:3000/dev/preview** (also linked from the home page):

- Walk through the client intake form
- Switch to clinician review
- Generate a report (template or Claude if `ANTHROPIC_API_KEY` is set)

Reports in dev preview are not persisted unless you use a real dashboard session.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run db:push` | Sync Prisma schema |
| `npm run db:seed` | Create a sample submitted session (see console output) |
| `npm test` | Unit tests (scoring + report template) |

## Report generation

- `POST /api/assessments/:id/report` — generates and saves a draft (Clerk auth)
- Uses **Gemini** or **Claude** when an API key is set; otherwise a template draft
- Clinicians edit the draft in the review UI; changes auto-save via `PATCH /api/sessions/:id`
