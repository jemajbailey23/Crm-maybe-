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
cp .env.example .env   # set DATABASE_URL to your Postgres instance, and AUTH_SECRET (openssl rand -hex 32)
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first visit prompts you to create an account — that's the only signup allowed; once an account exists, sign-up is disabled and further users would be added by an admin (a future feature).

## Deploying

This app is built to deploy straight to **Vercel** with a hosted Postgres database (e.g. **Neon** or **Supabase**, both have a free tier).

1. **Create a Postgres database** — on [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com), create a project and copy its connection string (a `postgresql://...` URL).
2. **Push this repo to GitHub** (already done if you're reading this from the repo) and import it in [Vercel](https://vercel.com/new).
3. **Set environment variables** in the Vercel project settings:
   - `DATABASE_URL` — the connection string from step 1
   - `AUTH_SECRET` — a random secret (`openssl rand -hex 32`)
4. **Deploy.** The build command (`prisma migrate deploy && next build`) automatically applies the database schema on every deploy — no manual migration step needed.
5. Visit the deployed URL and create your account on the first-run signup page.

## Password recovery

There's no self-service "forgot password" flow yet — this is a single-owner tool without email sending set up. If you're locked out, reset your password directly from the machine that has your production `DATABASE_URL`:

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
