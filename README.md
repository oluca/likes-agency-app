# Shortform Render (SaaS)

Multi-tenant web app in front of a video render service. Next.js 16 (App Router) + Supabase (Auth + Postgres with RLS).

## Setup

1. Create a Supabase project. In **Project Settings → API** copy the project URL and the publishable (anon) key.
2. `cp .env.example .env.local` and fill in:
   - `API_BASE_URL`, `API_KEY` (render API, server-only; the old `SHORTFORM_API_*` names still work)
   - `MAX_UPLOAD_MB` (upload limit, default 500)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; needed to store status, durations and billing on jobs)
3. Apply the schema: run every file in `supabase/migrations/` in order (0001 → 0005) in the Supabase SQL editor (or `supabase link` + `supabase db push`).
4. In **Authentication → URL Configuration** set the Site URL and add `<origin>/auth/callback` to the redirect URLs.
5. `npm install && npm run dev`

## How it works

- `src/proxy.ts` refreshes the session and does optimistic redirects (everything except `/login`, `/signup`, `/forgot-password`, `/auth/*`, `/invite/*` → `/login`; `/api/jobs/**` → 401).
- `src/lib/dal.ts` is the real authorization layer (user, workspace membership, job access); RLS enforces the same rules in the database.
- Signing up creates a profile and a personal workspace. Users can create more workspaces and invite members via links (Team page).
- `/api/jobs/**` still proxies to the render service, but every job is recorded in the `jobs` table with its workspace, and requests are limited to jobs of the caller's workspaces.
