# Bailey Ventures Digital CRM

An internal CRM built with Next.js, Prisma, and SQLite. Covers the core of a small-business CRM:

- **Contacts & companies** — customer/client records with notes and tags
- **Sales pipeline** — deals tracked through stages (New → Contacted → Proposal → Won/Lost)
- **Tasks** — follow-ups tied to a contact or deal, with due dates
- **Activity log** — a timeline of calls, emails, meetings, and notes per contact/deal

## Getting started

```bash
npm install
cp .env.example .env   # then set AUTH_SECRET to a random value (openssl rand -hex 32)
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first visit prompts you to create an account — that's the only signup allowed; once an account exists, sign-up is disabled and further users would be added by an admin (a future feature).

## Stack

- **Next.js 16** (App Router, Server Actions)
- **Prisma** + SQLite for data (swap `DATABASE_URL` for Postgres/MySQL to scale up — no code changes needed)
- **Custom session auth** (signed cookie via `jose`, passwords hashed with `bcryptjs`) — no third-party auth dependency
- **Tailwind CSS** for styling

## Project structure

- `src/app/(app)/` — authenticated app: dashboard, contacts, companies, deals (pipeline), tasks
- `src/app/login`, `src/app/signup` — auth pages
- `src/lib/auth.ts` — session/auth helpers
- `src/lib/prisma.ts` — Prisma client singleton
- `prisma/schema.prisma` — data model
