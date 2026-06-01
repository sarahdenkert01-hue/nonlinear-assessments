# Production deployment

## Database

The app uses **PostgreSQL** (`prisma/schema.prisma`).

1. Create a database (Neon, Supabase, RDS, etc.).
2. On **Supabase + Vercel**, set one URL from **Connect → Session** (port **5432**, host `*.pooler.supabase.com`):
   - Do **not** use `db.*.supabase.co` on Vercel (`P1001`).
   - Do **not** use the **Transaction** pooler (port **6543**) for `DATABASE_URL` — `prisma migrate deploy` can hang with no further log output.
3. After sign-in, `/dashboard` queries Postgres — if env vars or migrations are wrong, you get a server error.
4. Apply schema **before** deploy (not during the Vercel build — poolers cause `P1002` advisory lock timeouts):

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
| `DATABASE_URL` | Yes | Supabase **session** pooler (5432) on Vercel; one URL only |
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
