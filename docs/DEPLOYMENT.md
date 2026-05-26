# Production deployment

## Database

The app uses **PostgreSQL** (`prisma/schema.prisma`).

1. Create a database (Neon, Supabase, RDS, etc.) and copy the connection string.
2. Set `DATABASE_URL` in Vercel (and locally in `.env`).
3. Apply schema on deploy (see Vercel build command below) or run locally once:

```bash
npx prisma migrate deploy
```

For a fresh project with no migrations yet, create the initial migration locally against your Postgres URL:

```bash
npx prisma migrate dev --name init
```

## Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | PostgreSQL in production |
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
