# Bailey Ventures Digital CRM

An internal CRM built with Next.js and Prisma/Postgres. Covers the core of a small-business CRM:

- **Contacts & companies** — customer/client records with notes and tags
- **Sales pipeline** — deals tracked through stages (New → Contacted → Proposal → Won/Lost)
- **Tasks** — follow-ups tied to a contact or deal, with due dates
- **Activity log** — a timeline of calls, emails, meetings, and notes per contact/deal

## Getting started (local dev)

Requires a local or remote Postgres database.

```bash
npm install
cp .env.example .env   # set DATABASE_URL/DIRECT_URL to your Postgres instance, and AUTH_SECRET (openssl rand -hex 32)
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first visit prompts you to create an account — that's the only signup allowed; once an account exists, sign-up is disabled and further users would be added by an admin (a future feature).

## Deploying

This app deploys to **Vercel**, backed by a **Supabase** Postgres database.

1. **Get two connection strings from Supabase** — in your Supabase project: Project Settings → Database → Connection string.
   - **DATABASE_URL**: the **Transaction pooler** string (port `6543`). Vercel's serverless functions open a lot of short-lived connections, and Postgres has a hard connection limit — the pooler (PgBouncer) is what keeps that from exhausting it. Append `?pgbouncer=true` to the end if it isn't already there (this tells Prisma not to use prepared statements, which the pooler's transaction mode doesn't support).
   - **DIRECT_URL**: the **direct** connection string (port `5432`). Migrations (`prisma migrate deploy`) need a real, non-pooled connection to run DDL statements.
2. **Push this repo to GitHub** (already done if you're reading this from the repo) and import it in [Vercel](https://vercel.com/new).
3. **Set environment variables** in the Vercel project settings:
   - `DATABASE_URL` — the pooled string from step 1
   - `DIRECT_URL` — the direct string from step 1
   - `AUTH_SECRET` — a random secret (`openssl rand -hex 32`)
   - `APP_URL` — your deployed URL (e.g. `https://your-app.vercel.app`), used to build links in emails
   - `GMAIL_USER` / `GMAIL_APP_PASSWORD` — optional, see [Password recovery](#password-recovery) below
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — optional, lets leads have file attachments (see `.env.example` for setup)
   - `CREDENTIAL_ENCRYPTION_KEY` — required for the client Secure Credential Vault (`openssl rand -hex 32`); back this up somewhere safe, since losing it makes stored credentials unrecoverable
4. **Deploy.** The build command (`prisma migrate deploy && next build`) automatically applies the database schema on every deploy using `DIRECT_URL` — no manual migration step needed.
5. Visit the deployed URL and create your account on the first-run signup page.

## Password recovery

The login page has a "Forgot your password?" link that emails a reset link, sent via your own Gmail account — no separate email service needed.

**Setup (one-time):**

1. Turn on 2-Step Verification on the Google account you want to send from, if it isn't already: [myaccount.google.com/security](https://myaccount.google.com/security).
2. Create an **App Password**: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) — name it something like "CRM", copy the 16-character password it gives you.
3. Set `GMAIL_USER` (that Gmail address) and `GMAIL_APP_PASSWORD` (the app password, not your normal Gmail password) as environment variables.

If those aren't set (e.g. in local dev), reset links are logged to the server console instead of emailed — the flow still works, you just read the link from the terminal instead of your inbox.

**Fallback:** if you're ever locked out and email isn't working, you can always reset a password directly against the database:

```bash
DATABASE_URL="<your production connection string>" npm run reset-password -- you@example.com newpassword123
```

## Stack

- **Next.js 16** (App Router, Server Actions)
- **Prisma** + **Postgres** for data
- **Custom session auth** (signed cookie via `jose`, passwords hashed with `bcryptjs`) — no third-party auth dependency
- **Tailwind CSS** for styling

## Project structure

- `src/app/(app)/` — authenticated app: dashboard, contacts, companies, deals (pipeline), tasks
- `src/app/login`, `src/app/signup` — auth pages
- `src/lib/auth.ts` — session/auth helpers
- `src/lib/prisma.ts` — Prisma client singleton
- `prisma/schema.prisma` — data model
