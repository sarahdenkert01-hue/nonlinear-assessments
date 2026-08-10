# Production deployment

## Database

The app uses **PostgreSQL** (`prisma/schema.prisma`).

1. Create a database (Neon, Supabase, RDS, etc.).
2. On **Supabase + Vercel**, set **two** URLs (Connect → pooler strings, host `*.pooler.supabase.com`):
   - `DATABASE_URL` — **Transaction** mode, port **6543**, with `?pgbouncer=true&connection_limit=1`
   - `DIRECT_URL` — **Session** mode, port **5432** (migrations / `prisma migrate deploy`)
   - Do **not** use `db.*.supabase.co` as the Vercel runtime URL (`P1001` / IPv6 issues).
   - Do **not** point Vercel `DATABASE_URL` at session mode (5432): serverless fans out and hits `EMAXCONNSESSION` / pool_size: 15.
3. After sign-in, `/dashboard` queries Postgres — if env vars or migrations are wrong, you get a server error.
4. Apply schema **before** deploy (not during the Vercel build — advisory locks need `DIRECT_URL`):

```bash
npm run db:deploy
```

Run that locally whenever you add migrations, then push and let Vercel run `npm run build` (generate + Next only).

For a fresh project with no migrations yet, create the initial migration locally against your Postgres URL:

```bash
npx prisma migrate dev --name init
```

## Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Supabase **transaction** pooler (6543) + `pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Yes | Supabase **session** pooler (5432) for migrations |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk production instance |
| `CLERK_SECRET_KEY` | Yes | |
| `NEXT_PUBLIC_APP_URL` | Recommended | e.g. `https://app.example.com` — used in notification emails |
| `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` | Optional | Report drafting |
| `NOTIFY_EMAIL` | Optional | Clinician inbox for submission alerts |
| `RESEND_API_KEY` + `NOTIFY_FROM` | Optional | Sends email via [Resend](https://resend.com) |
| `REPORT_PROFILE` | Optional | `brief` \| `standard` \| `detailed` (default `standard`) |

## Hosting (Vercel)

1. Connect the Git repository.
2. Set environment variables in the Vercel project settings.
3. Build command: `npm run build` (runs `prisma generate` via `postinstall`).
4. Add a **build step** or use `prisma migrate deploy` in CI before deploy.
5. Report generation route uses `maxDuration = 60`; confirm your plan supports it.

## Security checklist

- Never expose API keys to the browser — LLM calls are server-only.
- Client intake uses unguessable tokens; revoke links when no longer needed.
- Consent is recorded with timestamp before any answers are saved.
- Audit log records clinician and client actions per session.
