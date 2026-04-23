# LabLink — Implementation Plan

## Overview

LabLink is a research marketplace platform — "LinkedIn for research positions" — connecting
college students with university lab opportunities through intelligent vector-based matching.

Labs are first-class entities. Professors create and own **lab groups**, post **role listings**
from within those labs, and manage members with tiered privileges. Students discover and apply
to role listings; upon acceptance they are added as members of the lab group.

**Stack:** Next.js 16 (App Router) + Supabase (Postgres + Auth) + Tailwind CSS v4 + Vercel + Google AI Studio (Gemini 3 Flash Preview for onboarding autofill)

## Current Implementation Status (Apr 2026)

This document includes both implemented work and planned roadmap items. The sections below
capture what is currently live in the codebase.

### How to read this plan

- `Implemented now` = already in the codebase and usable.
- `Roadmap (not started / partial)` = still to build; retained intentionally.
- Detailed sections later in this file are preserved as the source of truth for future work.

### Implemented now

- Landing page and global site navbar are implemented and shared across auth/onboarding pages.
- Auth is role-directed from landing page CTAs (`?role=student` / `?role=professor`) with:
  - `/auth/sign-up`
  - `/auth/sign-in`
  - `/auth/callback`
  - `/auth/post-login` role-based redirect after login
- `/auth/role-select` is removed from active flow.
- Supabase client/server helpers and middleware/proxy-style session refresh are implemented.
- Student onboarding and professor onboarding are implemented with Server Actions.
- Resume/CV upload autofill is implemented (student and professor use the **same** client pipeline):
  - `lib/onboarding/extract-text-from-file.ts` — PDF via `pdfjs-dist` (max **100** pages, **90s** wall-clock budget; then UTF-8 fallback so the UI cannot hang indefinitely)
  - `lib/onboarding/parse-onboarding-file.ts` — size check (10MB) → extract → `parseResumeWithLlm` server action
  - `app/onboarding/autofill-actions.ts` — Gemini (`gemini-3-flash-preview`) JSON extract + **60s** `fetch` timeout (`AbortController`); heuristic fallback when the key is missing, the request fails, times out, or JSON is invalid
  - Accepts `.pdf`, `.txt`, `.md`; step-1 dropzone + hidden file input; input cleared after each attempt so the same file can be re-chosen
- Onboarding wizards (`app/onboarding/student/wizard.tsx`, `app/onboarding/professor/wizard.tsx`): client `useState`, draft persisted in **`sessionStorage`**, per-step **title + description** headers, **scroll-to-top** on step change, **Back / Continue** with arrow icons (professor primary = `ll-navy`, student = `ll-purple`). Final submit is one **Server Action** (`completeStudentOnboarding` / `completeProfessorOnboarding`) with hidden inputs for the full draft.
- Synthetic test fixtures for autofill smoke tests: `docs/sample-student-resume.md`, `docs/sample-professor-cv.md`.
- Student onboarding currently uses a 6-step flow:
  1. Upload resume
  2. Basic info
  3. Research interests
  4. Skills (+ relevant courses moved here)
  5. Goals
  6. Preferences
- Professor onboarding currently uses a 5-step flow:
  1. Upload CV
  2. Profile
  3. Research
  4. Mentorship
  5. Preferences
- Tag-input UX is implemented for tag-based fields (Enter/comma add, `x` remove).
- Multi-select dropdown UX is standardized in shared component:
  - `components/multi-select-dropdown.tsx`
  - used across both onboarding flows.
- Professor dashboard shell is implemented at `/dashboard/professor` with:
  - welcome header
  - "Your labs" grid
  - create-lab CTA
  - recent activity section
- Lab creation flow is implemented at `/labs/new`:
  - two-step form (identity + research/settings)
  - tag-input UX for research tags/techniques
  - creates `lab_groups` row + creator `lab_memberships` row (`pi`)
- Lab management is implemented at `/labs/[labId]`:
  - tabs: Overview, Members, Role postings, Applicants
  - members role updates/removal/invite-link generation
  - postings status quick actions (open/close/archive)
  - posting creation page at `/labs/[labId]/postings/new`
  - applicant review at `/labs/[labId]/postings/[postingId]/applicants`
    (single status updates, reviewer notes, bulk move/reject, recommended ranking tab + profile filters)
  - applicant names in posting review open the student's full profile page (same My Profile layout, read-only)
- Student dashboard is implemented under `/dashboard/student` with a **layout shell** (left sidebar + top search bar):
  - **Explore** (`/dashboard/student`): large welcome, stats row, **horizontal scroll of AI-matched open roles** (from `match_cache` + `rankMatchesForStudent` refresh), **Discovery** section (placeholder), CTA to applications
  - **Applications** (`/dashboard/student/applications`): applications list + status
  - **Messaging** (`/dashboard/student/messaging`): placeholder
  - **Lab management** (`/dashboard/student/labs`): student lab memberships
  - **My profile** (`/dashboard/student/profile`): full editable profile page (all student fields + file uploads)
  - **Search** (`/dashboard/student/search?q=`): **semantic search** — `generate-embedding` **`query_embed`** → **`vector_match_role_postings_by_embedding`** → same **Gemini JSON re-rank** pattern as profile matching (`rankRolePostingsForSearchQuery` in `lib/matching.ts`); includes URL-backed multi-select filters for research field, role type, paid/unpaid, hours, year preference, and university (compact horizontal dropdown row with popout menus); Edge Function **`verify_jwt = false`** in `supabase/config.toml` for ES256 gateway compatibility
- Student apply flow baseline is implemented at `/postings/[id]`:
  - posting detail + application form
  - file-upload-first documents: resume required, optional cover letter
  - if profile resume exists, student can choose profile resume or upload a new one
  - statement + custom question response capture
  - submit inserts into `applications`
  - submit inserts manager notifications (`application_submitted`) when notifications table exists
  - discover list excludes postings the student has already applied to
- Global navigation is applied through root layout navbar across app routes.
- Vector matching groundwork is implemented: `pgvector` embeddings (gte-small, 384-dim) on `student_profiles` and `open` `role_postings`, `vector_match_role_postings` RPC (profile ↔ postings), `vector_match_students_for_posting` RPC (posting ↔ students), **`vector_match_role_postings_by_embedding`** (ad-hoc query text ↔ postings, `p_embedding` text → `vector(384)`), `match_cache` table, edge function `generate-embedding` (table/record updates + **`query_embed`**), and DB webhooks to refresh vectors where configured.
- **Stage 1 + Stage 2 matching** — `lib/matching.ts` `rankMatchesForStudent`:
  - Stage 1: top-50 shortlist from `vector_match_role_postings`
  - Stage 2: `gemini-2.0-flash` JSON re-rank with student + lab/posting context (requires `GOOGLE_AI_STUDIO_API_KEY`); heuristic skill-overlap + vector ordering fallback if the key is missing or the LLM call fails
  - Students can refresh their own `match_cache` rows (RLS policy in `20260421_match_cache_student_writes.sql`).

- **Local development database seeding** (so dashboards and lab flows are not empty):
  - `supabase/migrations/20260420_foundation_profiles.sql` defines `profiles`, `student_profiles`, and `professor_profiles` if they are missing (must run before lab tables that reference `public.profiles`).
  - `supabase/seed.sql` populates a large, idempotent sample: auth users, profiles, 15 labs, 60 `role_postings`, memberships, applications, `lab_follows`, and `notifications`. Seeded users use emails `profNN@lablink-seed.test` and `studentNN@lablink-seed.test` (NN = zero-padded 01, 02, …); see the header comment in `seed.sql` for counts and exact format.
  - **How to log in with a seed account:** after the seed has been applied, open the app at `/auth/sign-in`, enter the email and password below, submit. The seed sets `onboarding_complete` on `profiles`, so you should be sent through `/auth/post-login` to `/dashboard/student` or `/dashboard/professor` (matching the account’s `profiles.role`) without redoing onboarding.
    - **Student:** e.g. `student01@lablink-seed.test` / `SeedPass123!` (up through `student24@…` if you ran the default seed).
    - **Professor:** e.g. `prof01@lablink-seed.test` / `SeedPass123!` (up through `prof12@…`).
    - If sign-in is rejected, confirm the seed script completed without errors, the user exists under **Auth → Users** in Supabase, and (on hosted projects) that **“Confirm email”** is not blocking logins for those addresses; the seed pre-confirms emails, but your Auth settings can still require a provider or extra confirmation.
    - If the API returns **500** and **“Database error querying schema”** (often on password login for SQL-seeded users), the usual cause is **NULL** values in `auth.users` token columns that GoTrue expects as empty strings. Re-run the latest `supabase/seed.sql` (it sets `confirmation_token`, `email_change`, `email_change_token_new`, and `recovery_token` to `''` and includes an `UPDATE` for `*@lablink-seed.test`), or run the `UPDATE` block on `auth.users` in the top section of that file. See [supabase/auth#1940](https://github.com/supabase/auth/issues/1940).
  - **How to run the seed SQL:** `supabase db reset` (local CLI) uses `supabase/config.toml` `[db.seed]` to run `seed.sql` after migrations; for a **hosted** Supabase project, paste the full `seed.sql` into the **SQL Editor** and execute once. A successful run often reports **“Success. No rows returned”** because the script is inserts/PL blocks without a final `SELECT`—that is expected.
  - Re-running the seed on non-empty data may hit `ON CONFLICT` or duplicate auth emails; use a fresh project or clear conflicting rows if you need a clean re-seed.

### Not implemented yet (still roadmap)

- `vector_match_lab_posts` + recommended lab-posts feed, mixed with followed-lab content.
- Student feed ranking/mix, profile completeness scoring banner, and **Discovery** product (beyond placeholder). Discover-specific FTS integration remains roadmap; current search page uses **vectors + LLM rerank** with filter controls.
- Social lab posts feed, analytics dashboards, cron reminder/email automation, richer notification UX (beyond application-submit inserts).

### Milestone snapshot

- **Auth + onboarding foundation:** Implemented
- **Onboarding UX polish (tags, shared multiselects, sizing, required/optional cues):** Implemented
- **Resume/CV AI autofill path:** Implemented (shared client parse + PDF/LLM timeouts + heuristic fallback)
- **Lab lifecycle (create lab, postings, applications, memberships):** Implemented
- **Student dashboard baseline + apply flow baseline:** Implemented
- **Vector matching (stage 1 shortlist + stage 2 Gemini re-rank) + `match_cache`:** Implemented
- **Notifications/analytics/automation:** Partial (application-submit notifications; rest planned)

### Next recommended implementation order

1. Enrich student Explore/Feed UX: use `llm_rank` / `llm_reason` on home/discover consistently and add profile completeness banner. (Search page already has vector + LLM rerank and filter UI.)
2. Implement `vector_match_lab_posts` + `getRecommendedPosts` + Feed tab mixed stream.
3. Add social lab posts feed, analytics, and cron/email automation.

---

## 1. Infrastructure & Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Browser (Client)                           │
│   Next.js App (React 19)                                             │
│   ├── Server Components  (data fetching, no JS shipped to client)    │
│   ├── Client Components  (interactivity, forms, realtime)            │
│   └── Server Actions     (all mutations — no separate API layer)     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────▼──────────────────────────────────────┐
│                        Vercel Edge Network                           │
│   ├── CDN (static assets)                                            │
│   ├── Edge Middleware  (auth session check, role-based redirects)    │
│   └── Serverless Functions  (Server Actions, Route Handlers)         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                           Supabase                                   │
│   ├── Auth            (JWT sessions, email/password, magic link)     │
│   ├── Postgres        (primary DB, RLS on every table)               │
│   ├── pgvector        (vector similarity search — built-in)          │
│   ├── Realtime        (WebSocket subscriptions — notifications,       │
│   │                    application status updates)                   │
│   ├── Storage         (resumes, transcripts, lab logos, avatars)     │
│   └── Edge Functions  (embedding generation, email on status change) │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
              ┌────────────────▼─────────────────┐
              │         Google AI Studio          │
              │   gemini-2.0-flash  (re-ranking)  │
              └───────────────────────────────────┘
```

### Data Flow

**Page load (Server Component):**
```
Browser → Vercel Edge → Next.js RSC → supabase/server.ts
  → Postgres (RLS-filtered) → RSC renders HTML → Browser
```

**Mutation (Server Action):**
```
Browser form submit → Server Action → supabase/server.ts
  → Postgres upsert → revalidatePath() → RSC re-render
```

**Embedding pipeline (async, non-blocking):**
```
student_profiles / role_postings INSERT or UPDATE
  → Supabase DB Webhook → Edge Function: generate-embedding
  → Supabase.ai.session('Supabase/gte-small') [runs in-process, no external API]
  → UPDATE row SET embedding = [384-dim vector]
```

**Match feed (on student dashboard load):**
```
Server Action: rankMatchesForStudent(studentId)
  → RPC: vector_match_role_postings()  [pgvector ANN, top-50]
  → fetch full posting details
  → POST gemini-2.0-flash with student + posting context
  → Gemini returns ordered list + per-match reason
  → upsert match_cache
  → feed renders sorted by llm_rank
```

### Supabase Setup
- Create project; add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`
- Install `@supabase/supabase-js` and `@supabase/ssr`
- `lib/supabase/client.ts` — `createBrowserClient()` for Client Components
- `lib/supabase/server.ts` — `createServerClient()` reading cookies for RSC + Server Actions
- Enable `vector` extension in Supabase dashboard → Database → Extensions

### Middleware

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request)
  const { data: { session } } = await supabase.auth.getSession()

  const isProtected =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/onboarding') ||
    request.nextUrl.pathname.startsWith('/labs')

  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/auth/sign-in', request.url))
  }

  if (session && request.nextUrl.pathname.startsWith('/onboarding')) {
    const { data: profile } = await supabase
      .from('profiles').select('onboarding_complete, role').single()
    if (profile?.onboarding_complete) {
      return NextResponse.redirect(
        new URL(`/dashboard/${profile.role}`, request.url)
      )
    }
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/labs/:path*']
}
```

### Role-Select & Auth Pages

> Note: `role-select` remains documented below for historical plan context, but the active
> implementation now routes users directly from landing page cards to role-specific sign-in/sign-up.

**`/auth/role-select`** — shown before any credentials are entered. Two large clickable
cards side by side:

```
┌─────────────────────────┐   ┌─────────────────────────┐
│        🎓 Student        │   │   🔬 Professor / Lab     │
│                         │   │                         │
│  Discover research      │   │  Post roles, manage     │
│  opportunities and      │   │  your lab group, and    │
│  apply to labs.         │   │  recruit students.      │
│                         │   │                         │
│  [ Create account ]     │   │  [ Create account ]     │
│  [ Sign in ]            │   │  [ Sign in ]            │
└─────────────────────────┘   └─────────────────────────┘
```

- Each "Create account" button navigates to `/auth/sign-up?role=student` (or `professor`)
- Each "Sign in" button navigates to `/auth/sign-in?role=student` (or `professor`)
- `/auth/sign-up` reads `searchParams.role`, stores it in a hidden field, and passes it
  as `raw_user_meta_data.role` in the Supabase `signUp()` call — the `handle_new_user`
  trigger picks it up automatically
- `/auth/sign-in` reads `?role` only for UI hints (show matching icon/copy); role is
  authoritative from the DB, not the query param
- Direct navigation to `/auth/sign-up` without a `?role` param redirects to `/auth/role-select`

### Storage Buckets

| Bucket | Access | Contents |
|---|---|---|
| `resumes` | Private (owner; lab managers on application) | Student resume PDFs |
| `transcripts` | Private (owner; lab managers on application) | Student transcript PDFs |
| `lab-assets` | Public | Lab logos, banner images |
| `post-media` | Public | Lab social post images / attachments |
| `avatars` | Public | User avatar images |

---

## 2. User Flows

### Professor Flow
```
Landing page → "I'm a Professor / Lab Administrator" card
  → /auth/role-select?role=professor
      → "Create account" → /auth/sign-up?role=professor  (email + password form)
      → "Sign in"        → /auth/sign-in?role=professor
  → Onboarding wizard (personal info + research background)
  → Professor Dashboard
      │
      ├── Create Lab Group
      │     → Lab setup wizard (name, university, dept, fields, description, logo)
      │     → Creator is automatically added as PI
      │
      └── Per-Lab Management Dashboard (/labs/[labId])
            ├── Overview        — lab description, stats, public profile
            ├── Members         — view/manage members and their lab roles
            ├── Role Postings   — create, edit, open/close postings
            ├── Applications    — review applicants per posting
            └── Settings        — edit lab info, manage lab-level permissions
```

### Student Flow
```
Landing page → "I'm a Student" card
  → /auth/role-select?role=student
      → "Create account" → /auth/sign-up?role=student  (email + password form)
      → "Sign in"        → /auth/sign-in?role=student
  → Onboarding wizard (profile, skills, interests, preferences)
  → Student Dashboard
      │
      ├── Discover — AI-matched role listings across all labs
      ├── Apply    — submit application to a role listing
      ├── Track    — view application status per posting
      │
      └── My Labs (after acceptance)
            → Added as lab member with assigned lab role
            → Can view lab profile, members, and announcements
```

### Lab Membership & Role Posting Lifecycle
```
Professor creates Role Posting inside a Lab
  → Students discover it (via feed or search)
  → Student submits Application
  → Lab manager/PI reviews applicants
  → Status: submitted → reviewing → interview → accepted / rejected
  → On acceptance: application.status = 'accepted'
                   → Server Action creates lab_memberships row
                      (student_id, lab_id, lab_role = posting's member_role)
  → Student now appears in the lab's Members tab
```

---

## 3. Lab Roles & Permissions

Every `lab_memberships` row has a `lab_role`. This drives what the member can do inside
a lab's management dashboard.

| Lab Role | Can Edit Lab | Can Manage Members | Can Create Postings | Can Review Applicants | Can View Lab |
|---|:---:|:---:|:---:|:---:|:---:|
| `pi` | ✓ | ✓ (all) | ✓ | ✓ | ✓ |
| `lab_manager` | ✓ | ✓ (non-PI) | ✓ | ✓ | ✓ |
| `postdoc` | — | — | ✓ (own) | ✓ (own) | ✓ |
| `grad_researcher` | — | — | ✓ (own) | ✓ (own) | ✓ |
| `undergrad_ra` | — | — | — | — | ✓ |
| `lab_technician` | — | — | — | — | ✓ |
| `volunteer` | — | — | — | — | ✓ |

"Own" means postings they personally created. Postings created by grad researchers / postdocs
are visible to PI and lab_manager for review/approval before going live (optional — controlled
by a `requires_approval` flag on the lab group).

---

## 4. Database Schema

### Design Principles
- Every table: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `created_at timestamptz NOT NULL DEFAULT now()`
- FK with `ON DELETE CASCADE` unless orphan data should be preserved (`ON DELETE SET NULL`)
- All multi-select fields: `text[]`; structured nested objects: `jsonb`
- `CHECK` constraints on all enum-like text columns
- RLS enabled on every table, default deny
- GIN indexes on all `text[]` and `jsonb` columns used in filtering
- Embedding columns: `vector(384)` — matches `Supabase/gte-small` output dimensions

### Entity Relationship

```
auth.users
    │ (trigger: handle_new_user)
    ▼
profiles
    │
    ├── student_profiles   (one per student)
    │       │
    │       ├── applications  ──────────────────────────┐
    │       │       │ (on acceptance)                   │
    │       │       ▼                                   │
    │       └── lab_memberships ◄───────────────────────┤
    │                                                   │
    └── professor_profiles (one per professor)          │
                                                        │
lab_groups ◄── lab_memberships (professor as PI)        │
    │                                                   │
    └── role_postings ──────────────────────────────────┘
            │
            └── applications

notifications  (fan-out to any profile)
match_cache    (student_id + role_posting_id)
```

---

### Table: `profiles`

```sql
CREATE TABLE public.profiles (
  id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role                text NOT NULL CHECK (role IN ('student', 'professor')),
  display_name        text,
  avatar_url          text,
  email               text NOT NULL,
  is_verified         boolean NOT NULL DEFAULT false,
  onboarding_complete boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
```

---

### Table: `student_profiles`

Comprehensive profile built during onboarding. Every field maps directly to an onboarding step.

```sql
CREATE TABLE public.student_profiles (
  id                  uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Step 1: Personal & Academic
  full_name           text,
  university          text,
  major               text[]      DEFAULT '{}',
  minor               text[]      DEFAULT '{}',
  year                text        CHECK (year IN ('freshman','sophomore','junior','senior','graduate','other')),
  graduation_month    smallint    CHECK (graduation_month BETWEEN 1 AND 12),
  graduation_year     smallint,
  gpa                 numeric(3,2),
  is_gpa_visible      boolean     NOT NULL DEFAULT true,

  -- Step 2: Research Interests
  research_fields     text[]      DEFAULT '{}',   -- broad fields (Biology, CS, etc.)
  research_topics     text[]      DEFAULT '{}',   -- specific topics (CRISPR, ML, etc.)
  ranked_interests    text[]      DEFAULT '{}',   -- ordered top-3

  -- Step 3: Technical Skills
  -- [{"name": "PCR", "proficiency": "intermediate", "category": "lab_technique"}]
  skills              jsonb       NOT NULL DEFAULT '[]',
  programming_languages text[]    DEFAULT '{}',   -- Python, R, MATLAB, etc.
  lab_equipment       text[]      DEFAULT '{}',   -- specific instruments they've used
  software_tools      text[]      DEFAULT '{}',   -- GraphPad, ImageJ, SPSS, etc.

  -- Step 4: Experience
  prior_experience    text[]      DEFAULT '{}',   -- research_lab, hospital_volunteering, shadowing, clinical, none
  -- [{"role": "Research Intern", "lab": "Dr. Smith Lab", "duration": "6 months", "description": "..."}]
  experience_details  jsonb       NOT NULL DEFAULT '[]',
  transcript_url      text,
  parsed_gpa          numeric(3,2),
  -- [{"name": "Biochemistry", "grade": "A", "credits": 3}]
  parsed_courses      jsonb       NOT NULL DEFAULT '[]',
  resume_url          text,       -- optional upload during onboarding

  -- Step 5: Goals & Preferences
  role_types_sought   text[]      DEFAULT '{}',   -- undergrad_ra, grad_ra, lab_tech, volunteer, paid_internship
  time_commitment     text        CHECK (time_commitment IN ('<5','5-10','10-20','20+')),
  paid_preference     text        CHECK (paid_preference IN ('paid','unpaid','either')),
  start_availability  text,       -- e.g. "Spring 2026", "Immediately"
  experience_types    text[]      DEFAULT '{}',   -- hands_on_lab, patient_interaction, data_analysis, shadowing, mentorship
  motivations         text[]      DEFAULT '{}',   -- med_school_prep, lab_experience, specific_topic, relationships, career_exploration
  priorities          text[]      DEFAULT '{}',   -- max 3: hands_on, patient_exposure, mentorship, flexible_schedule, prestige, publications
  willing_to_volunteer boolean    NOT NULL DEFAULT true,

  -- Step 6: Academic Background
  relevant_courses    text[]      DEFAULT '{}',   -- courses they've completed relevant to research
  honors_or_awards    text,
  publications        text,       -- free text, e.g. links or citations

  -- Vector embedding (generated async by Edge Function)
  embedding           vector(384),

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER student_profiles_updated_at
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_sp_university   ON public.student_profiles(university);
CREATE INDEX idx_sp_year         ON public.student_profiles(year);
CREATE INDEX idx_sp_fields       ON public.student_profiles USING GIN(research_fields);
CREATE INDEX idx_sp_topics       ON public.student_profiles USING GIN(research_topics);
CREATE INDEX idx_sp_skills       ON public.student_profiles USING GIN(skills jsonb_path_ops);
CREATE INDEX idx_sp_embedding    ON public.student_profiles USING hnsw (embedding vector_cosine_ops);

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own profile"
  ON public.student_profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "Lab members can view student profiles of applicants"
  ON public.student_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'professor'
    )
    OR auth.uid() = id
  );
```

---

### Table: `professor_profiles`

Collected during professor onboarding. Separate from lab groups — one professor can own
or be a member of multiple labs.

```sql
CREATE TABLE public.professor_profiles (
  id                  uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Step 1: Personal Info
  full_name           text,
  title               text,       -- "Assistant Professor", "Postdoctoral Researcher", etc.
  university          text,
  department          text,
  office_location     text,
  lab_website         text,
  google_scholar_url  text,
  orcid               text,

  -- Step 2: Research Background
  research_fields     text[]      DEFAULT '{}',
  research_keywords   text[]      DEFAULT '{}',   -- PCR, CRISPR, machine learning, etc.
  research_summary    text,       -- short bio / lab description written by them

  -- Step 3: What They Look For
  preferred_student_year      text[]  DEFAULT '{}',
  preferred_majors            text[]  DEFAULT '{}',
  preferred_experience_level  text    CHECK (preferred_experience_level IN (
                                         'none','intro_courses','prior_experience'
                                       )),
  mentorship_style    text[]      DEFAULT '{}',   -- hands_on, independent, collaborative
  lab_culture         text[]      DEFAULT '{}',   -- fast_paced, collaborative, clinical, etc.

  -- Step 4: Account Preferences
  profile_visibility          text NOT NULL DEFAULT 'public'
                                CHECK (profile_visibility IN ('public','university_only')),
  notify_new_applications     boolean NOT NULL DEFAULT true,
  notify_weekly_digest        boolean NOT NULL DEFAULT true,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER professor_profiles_updated_at
  BEFORE UPDATE ON public.professor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.professor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professors manage own profile"
  ON public.professor_profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "Anyone can view professor profiles"
  ON public.professor_profiles FOR SELECT USING (true);
```

---

### Table: `lab_groups`

Created after onboarding. A professor may own or belong to multiple labs.

```sql
CREATE TABLE public.lab_groups (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                text UNIQUE NOT NULL,   -- url-friendly: "smith-neuro-lab"
  name                text NOT NULL,
  tagline             text,                  -- one-liner shown on cards
  description         text,
  university          text NOT NULL,
  department          text,
  website_url         text,
  logo_url            text,                  -- Supabase Storage: lab-assets bucket
  banner_url          text,

  -- Research identity
  research_fields     text[]  NOT NULL DEFAULT '{}',
  research_tags       text[]  NOT NULL DEFAULT '{}',
  lab_environment     text[]  NOT NULL DEFAULT '{}',

  -- Lab settings
  requires_posting_approval boolean NOT NULL DEFAULT false,
  -- if true, postings by grad_researcher/postdoc go to draft until PI/manager approves

  is_active           boolean NOT NULL DEFAULT true,
  created_by          uuid NOT NULL REFERENCES public.profiles(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER lab_groups_updated_at
  BEFORE UPDATE ON public.lab_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_lab_university ON public.lab_groups(university);
CREATE INDEX idx_lab_fields     ON public.lab_groups USING GIN(research_fields);
CREATE INDEX idx_lab_tags       ON public.lab_groups USING GIN(research_tags);

ALTER TABLE public.lab_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active labs"
  ON public.lab_groups FOR SELECT USING (is_active = true);

CREATE POLICY "PI and lab_manager can update lab"
  ON public.lab_groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.lab_memberships
      WHERE lab_id = id
        AND user_id = auth.uid()
        AND lab_role IN ('pi','lab_manager')
    )
  );

CREATE POLICY "Professors can create labs"
  ON public.lab_groups FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'professor')
  );
```

---

### Table: `lab_memberships`

Dual-purpose: tracks management members (PI, lab_manager, etc.) and accepted students
(undergrad_ra, lab_technician, volunteer). A row is created either when a professor is
added to a lab manually, or automatically when a student's application is accepted.

```sql
CREATE TABLE public.lab_memberships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id      uuid NOT NULL REFERENCES public.lab_groups(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lab_role    text NOT NULL CHECK (lab_role IN (
                'pi',
                'lab_manager',
                'postdoc',
                'grad_researcher',
                'undergrad_ra',
                'lab_technician',
                'volunteer'
              )),
  -- populated when membership was created via application acceptance
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  is_active   boolean NOT NULL DEFAULT true,
  UNIQUE (lab_id, user_id)
);

CREATE INDEX idx_lm_lab_id  ON public.lab_memberships(lab_id);
CREATE INDEX idx_lm_user_id ON public.lab_memberships(user_id);

ALTER TABLE public.lab_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lab members can view membership list"
  ON public.lab_memberships FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.lab_memberships lm2
      WHERE lm2.lab_id = lab_id AND lm2.user_id = auth.uid()
    )
  );

CREATE POLICY "PI and lab_manager can manage members"
  ON public.lab_memberships FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lab_memberships lm
      WHERE lm.lab_id = NEW.lab_id
        AND lm.user_id = auth.uid()
        AND lm.lab_role IN ('pi','lab_manager')
    )
  );

CREATE POLICY "PI and lab_manager can update member roles"
  ON public.lab_memberships FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.lab_memberships lm
      WHERE lm.lab_id = lab_memberships.lab_id
        AND lm.user_id = auth.uid()
        AND lm.lab_role IN ('pi','lab_manager')
    )
  );
```

---

### Table: `role_postings`

Job listings posted by a lab. Each posting carries its own requirements independently
of the lab's defaults, so a lab can run multiple concurrent postings with different criteria.

```sql
CREATE TABLE public.role_postings (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id               uuid NOT NULL REFERENCES public.lab_groups(id) ON DELETE CASCADE,
  created_by           uuid NOT NULL REFERENCES public.profiles(id),

  -- Listing
  title                text NOT NULL,
  description          text,
  status               text NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','open','closed','archived')),
  application_deadline date,

  -- What role accepted students will receive in the lab
  member_role          text NOT NULL CHECK (member_role IN (
                          'undergrad_ra','grad_researcher','postdoc',
                          'lab_technician','volunteer'
                        )),

  -- Position Details
  is_paid              text    CHECK (is_paid IN ('paid','unpaid','either')),
  hourly_rate_range    text,   -- e.g. "15-18/hr" for paid positions
  hours_per_week       text    CHECK (hours_per_week IN ('<5','5-10','10-20','20+')),
  duration             text,   -- e.g. "One semester", "Ongoing", "Summer 2026"
  start_date           text,   -- e.g. "Spring 2026"
  spots_available      smallint,

  -- Required & preferred skills
  required_skills      text[]  NOT NULL DEFAULT '{}',
  preferred_skills     text[]  NOT NULL DEFAULT '{}',

  -- Candidate filters
  preferred_year       text[]  NOT NULL DEFAULT '{}',
  preferred_majors     text[]  NOT NULL DEFAULT '{}',
  min_experience       text    CHECK (min_experience IN (
                                 'none','intro_courses','prior_experience'
                               )),

  -- Academic Requirements
  min_gpa              numeric(3,2),
  gpa_enforcement      text    CHECK (gpa_enforcement IN ('strict','preferred','holistic')),
  priority_courses     text[]  NOT NULL DEFAULT '{}',

  -- Application Config
  eval_methods         text[]  NOT NULL DEFAULT '{}',
  -- [{"id": "q1", "prompt": "Describe your relevant experience.", "required": true}]
  custom_questions     jsonb   NOT NULL DEFAULT '[]',

  -- Vector embedding (generated async by Edge Function)
  embedding            vector(384),

  -- Full-text search
  fts tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))
  ) STORED,

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER role_postings_updated_at
  BEFORE UPDATE ON public.role_postings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_rp_lab_id     ON public.role_postings(lab_id);
CREATE INDEX idx_rp_status     ON public.role_postings(status);
CREATE INDEX idx_rp_fields     ON public.role_postings USING GIN(required_skills);
CREATE INDEX idx_rp_fts        ON public.role_postings USING GIN(fts);
CREATE INDEX idx_rp_embedding  ON public.role_postings USING hnsw (embedding vector_cosine_ops);

ALTER TABLE public.role_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view open postings"
  ON public.role_postings FOR SELECT
  USING (status = 'open' OR lab_id IN (
    SELECT lab_id FROM public.lab_memberships
    WHERE user_id = auth.uid() AND lab_role IN ('pi','lab_manager','postdoc','grad_researcher')
  ));

CREATE POLICY "Authorized lab members can manage postings"
  ON public.role_postings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lab_memberships lm
      WHERE lm.lab_id = NEW.lab_id
        AND lm.user_id = auth.uid()
        AND lm.lab_role IN ('pi','lab_manager','postdoc','grad_researcher')
    )
  );

CREATE POLICY "Posting creator or PI/manager can update"
  ON public.role_postings FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.lab_memberships lm
      WHERE lm.lab_id = role_postings.lab_id
        AND lm.user_id = auth.uid()
        AND lm.lab_role IN ('pi','lab_manager')
    )
  );
```

---

### Table: `applications`

One row per student–posting pair. Acceptance triggers a `lab_memberships` insert.

```sql
CREATE TABLE public.applications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posting_id        uuid NOT NULL REFERENCES public.role_postings(id) ON DELETE CASCADE,
  student_id        uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,

  status            text NOT NULL DEFAULT 'submitted'
                      CHECK (status IN (
                        'submitted','reviewing','interview','accepted','rejected','withdrawn'
                      )),
  status_updated_at timestamptz NOT NULL DEFAULT now(),

  -- Materials
  resume_url        text,
  transcript_url    text,
  statement         text,
  -- {"q1": "I have experience in...", "q2": "I am available..."}
  custom_responses  jsonb NOT NULL DEFAULT '{}',

  -- Lab-private notes
  reviewer_notes    text,

  UNIQUE (posting_id, student_id),

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Track when status last changed
CREATE OR REPLACE FUNCTION public.sync_application_status_time()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER applications_status_time
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.sync_application_status_time();

-- Auto-create lab membership when application is accepted
CREATE OR REPLACE FUNCTION public.handle_application_accepted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_lab_id    uuid;
  v_role      text;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    SELECT rp.lab_id, rp.member_role
      INTO v_lab_id, v_role
      FROM public.role_postings rp
      WHERE rp.id = NEW.posting_id;

    INSERT INTO public.lab_memberships (lab_id, user_id, lab_role, application_id)
    VALUES (v_lab_id, NEW.student_id, v_role, NEW.id)
    ON CONFLICT (lab_id, user_id) DO UPDATE
      SET lab_role = v_role, application_id = NEW.id, is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_application_accepted
  AFTER UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_application_accepted();

CREATE INDEX idx_app_posting   ON public.applications(posting_id);
CREATE INDEX idx_app_student   ON public.applications(student_id);
CREATE INDEX idx_app_status    ON public.applications(status);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own applications"
  ON public.applications FOR ALL USING (auth.uid() = student_id);

CREATE POLICY "Authorized lab members view applications"
  ON public.applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.role_postings rp
      JOIN public.lab_memberships lm ON lm.lab_id = rp.lab_id
      WHERE rp.id = posting_id
        AND lm.user_id = auth.uid()
        AND lm.lab_role IN ('pi','lab_manager','postdoc','grad_researcher')
    )
  );

CREATE POLICY "PI/manager can update application status"
  ON public.applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.role_postings rp
      JOIN public.lab_memberships lm ON lm.lab_id = rp.lab_id
      WHERE rp.id = posting_id
        AND lm.user_id = auth.uid()
        AND lm.lab_role IN ('pi','lab_manager')
    )
  );
```

---

### Table: `lab_follows`

Students follow labs they are interested in. Followed labs' posts are prioritised in the
Feed tab and the student receives a notification when that lab publishes a new posting.

```sql
CREATE TABLE public.lab_follows (
  student_id  uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  lab_id      uuid NOT NULL REFERENCES public.lab_groups(id) ON DELETE CASCADE,
  followed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, lab_id)
);

CREATE INDEX idx_lf_student ON public.lab_follows(student_id);
CREATE INDEX idx_lf_lab     ON public.lab_follows(lab_id);

ALTER TABLE public.lab_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own follows"
  ON public.lab_follows FOR ALL USING (auth.uid() = student_id);

CREATE POLICY "Anyone can see follow counts"
  ON public.lab_follows FOR SELECT USING (true);
```

Follower count shown on the public lab profile is a simple `COUNT(*)` query — no
denormalised counter column needed at this scale.

---

### Table: `match_cache`

Pre-computed vector + LLM match results per student–posting pair.
Invalidated by triggers when a student profile or role posting changes.

```sql
CREATE TABLE public.match_cache (
  student_id    uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  posting_id    uuid NOT NULL REFERENCES public.role_postings(id) ON DELETE CASCADE,
  vector_score  float4 NOT NULL,   -- cosine similarity from pgvector (0–1)
  llm_rank      smallint,          -- Gemini re-rank position (1 = best fit)
  llm_reason    text,              -- one-sentence explanation shown on card
  computed_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, posting_id)
);

CREATE INDEX idx_mc_student_rank
  ON public.match_cache(student_id, llm_rank ASC NULLS LAST);

CREATE OR REPLACE FUNCTION public.invalidate_student_match_cache()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.match_cache WHERE student_id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER invalidate_on_student_update
  AFTER UPDATE ON public.student_profiles
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_student_match_cache();

CREATE OR REPLACE FUNCTION public.invalidate_posting_match_cache()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.match_cache WHERE posting_id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER invalidate_on_posting_update
  AFTER UPDATE ON public.role_postings
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_posting_match_cache();

ALTER TABLE public.match_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own match scores"
  ON public.match_cache FOR SELECT USING (auth.uid() = student_id);
```

---

### Table: `lab_posts`

Social posts created by labs — equivalent to LinkedIn posts. Supports captions, multiple
media attachments, and tags. Embedded for personalised feed ranking.

```sql
CREATE TABLE public.lab_posts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id       uuid NOT NULL REFERENCES public.lab_groups(id) ON DELETE CASCADE,
  author_id    uuid NOT NULL REFERENCES public.profiles(id),   -- lab member who posted

  -- Content
  caption      text NOT NULL,
  -- [{"url": "post-media/abc.jpg", "type": "image", "alt": "Western blot results"}]
  media        jsonb NOT NULL DEFAULT '[]',
  tags         text[] NOT NULL DEFAULT '{}',    -- e.g. ["CRISPR","neuroscience","publication"]
  link_url     text,                            -- optional external link (paper, preprint, etc.)
  link_title   text,                            -- display title for the link preview

  -- Visibility
  is_published boolean NOT NULL DEFAULT true,

  -- Full-text search across caption + tags
  fts tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(caption, '') || ' ' || array_to_string(tags, ' '))
  ) STORED,

  -- Vector embedding for personalised feed ranking
  -- Generated async by generate-embedding Edge Function (same webhook pattern as role_postings)
  embedding    vector(384),

  -- Lightweight view counter incremented server-side for analytics
  post_views   integer NOT NULL DEFAULT 0,

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER lab_posts_updated_at
  BEFORE UPDATE ON public.lab_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_lp_lab_id    ON public.lab_posts(lab_id);
CREATE INDEX idx_lp_tags      ON public.lab_posts USING GIN(tags);
CREATE INDEX idx_lp_fts       ON public.lab_posts USING GIN(fts);
CREATE INDEX idx_lp_embedding ON public.lab_posts USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_lp_created   ON public.lab_posts(created_at DESC);

ALTER TABLE public.lab_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published posts"
  ON public.lab_posts FOR SELECT USING (is_published = true);

CREATE POLICY "Lab members with management role can insert posts"
  ON public.lab_posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lab_memberships lm
      WHERE lm.lab_id = NEW.lab_id
        AND lm.user_id = auth.uid()
        AND lm.lab_role IN ('pi','lab_manager','postdoc','grad_researcher')
    )
  );

CREATE POLICY "Post author or PI/manager can update or delete"
  ON public.lab_posts FOR UPDATE USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.lab_memberships lm
      WHERE lm.lab_id = lab_posts.lab_id
        AND lm.user_id = auth.uid()
        AND lm.lab_role IN ('pi','lab_manager')
    )
  );

CREATE POLICY "Post author or PI/manager can delete"
  ON public.lab_posts FOR DELETE USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.lab_memberships lm
      WHERE lm.lab_id = lab_posts.lab_id
        AND lm.user_id = auth.uid()
        AND lm.lab_role IN ('pi','lab_manager')
    )
  );
```

---

### Table: `notifications`

```sql
CREATE TABLE public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN (
               'new_match',
               'application_submitted',
               'application_status_change',
               'added_to_lab',
               'posting_published',
               'new_lab_post',
               'deadline_reminder'
             )),
  -- new_match:                 {"posting_id": "...", "lab_name": "..."}
  -- application_status_change: {"application_id": "...", "new_status": "accepted", "posting_title": "..."}
  -- added_to_lab:              {"lab_id": "...", "lab_name": "...", "lab_role": "undergrad_ra"}
  -- posting_published:         {"posting_id": "...", "title": "...", "lab_name": "..."}  (sent to followers)
  -- new_lab_post:              {"post_id": "...", "lab_name": "...", "caption_preview": "..."}  (sent to followers)
  -- deadline_reminder:         {"posting_id": "...", "title": "...", "deadline": "2026-05-01", "days_left": 3}
  payload    jsonb NOT NULL DEFAULT '{}',
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_unread
  ON public.notifications(user_id, created_at DESC)
  WHERE read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notifications"
  ON public.notifications FOR ALL USING (auth.uid() = user_id);
```

---

### Migration File Order

```
supabase/migrations/
  001_extensions.sql            -- CREATE EXTENSION IF NOT EXISTS vector;
  002_profiles.sql
  003_student_profiles.sql      -- includes embedding vector(384)
  004_professor_profiles.sql
  005_lab_groups.sql
  006_lab_memberships.sql
  007_role_postings.sql         -- includes embedding vector(384) + fts
  008_applications.sql          -- includes handle_application_accepted trigger
  009_lab_follows.sql
  010_match_cache.sql
  011_lab_posts.sql             -- includes embedding vector(384) + fts
  012_notifications.sql
  013_vector_rpc.sql            -- vector_match_role_postings + vector_match_lab_posts functions
```

---

## 5. Vector Matching System

### Overview

Matching runs in two stages. Embeddings are generated by Supabase's built-in AI inference
(`Supabase/gte-small`) running directly inside Edge Functions — no external embedding API
key required. The LLM re-ranking call uses Google AI Studio (Gemini).

```
Student profile saved / updated
  → DB Webhook → Edge Function: generate-embedding
  → Supabase.ai.session('Supabase/gte-small')  ← runs in-process (WebAssembly)
  → student_profiles.embedding updated

Role posting saved / updated
  → DB Webhook → Edge Function: generate-embedding
  → Supabase.ai.session('Supabase/gte-small')
  → role_postings.embedding updated

Lab post (social) saved / updated
  → DB Webhook → Edge Function: generate-embedding
  → Supabase.ai.session('Supabase/gte-small')
  → lab_posts.embedding updated

Student visits Discover feed (role listings)
  → Server Action: rankMatchesForStudent(studentId)
      Stage 1: RPC vector_match_role_postings()
               pgvector HNSW ANN → top-50 by cosine similarity
      Stage 2: gemini-2.0-flash re-rank
               ordered list + per-posting reason
      → upsert match_cache
      → feed sorted by llm_rank, reason shown on card

Student visits social Feed tab
  → Server Action: getRecommendedPosts(studentId)
      RPC vector_match_lab_posts()
        pgvector HNSW ANN → top-30 posts ranked by cosine similarity to student profile
      → sorted by vector_score DESC, with recency tiebreak (posts >30 days old deprioritised)
      → no LLM call needed here — cosine similarity alone is sufficient for social posts
```

### What Gets Embedded

Both texts are assembled deterministically from DB columns — no user free-text
that could distort the embedding.

**Student text:**
```
Research interests: neuroscience, cancer research.
Specific topics: patch clamp, optogenetics.
Skills: PCR (intermediate), cell culture (beginner), Python (intermediate).
Equipment: confocal microscope, flow cytometer.
Prior experience: hospital volunteering, research lab.
Looking for: hands-on lab work, long-term mentorship.
Year: sophomore. Major: biology, pre-med.
```

**Role posting text:**
```
Title: Undergraduate Research Assistant — Neuroscience Lab.
Lab: Smith Neuroimmunology Lab. Fields: neuroscience, immunology.
Tags: patch clamp, mouse models, confocal microscopy.
Required skills: pipetting, cell culture.
Preferred skills: PCR, microscopy.
Environment: mentorship-heavy, hands-on training.
Preferred year: freshman, sophomore, junior.
Duration: Ongoing. Hours: 10-20/week.
```

### Edge Function: `generate-embedding`

```typescript
// supabase/functions/generate-embedding/index.ts
import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

serve(async (req) => {
  const { table, record } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Supabase's built-in AI — runs gte-small locally, no external API call
  const model = new Supabase.ai.Session('Supabase/gte-small')
  const text = table === 'student_profiles'
    ? buildStudentText(record)
    : buildPostingText(record)

  const embedding = await model.run(text, { mean_pool: true, normalize: true })

  await supabase
    .from(table)
    .update({ embedding: Array.from(embedding as number[]) })
    .eq('id', record.id)

  return new Response('ok')
})

function buildStudentText(r: Record<string, unknown>): string {
  const skills = (r.skills as { name: string; proficiency: string }[])
    .map(s => `${s.name} (${s.proficiency})`).join(', ')
  return [
    `Research interests: ${(r.research_fields as string[]).join(', ')}.`,
    `Specific topics: ${(r.research_topics as string[]).join(', ')}.`,
    `Skills: ${skills}.`,
    `Equipment: ${(r.lab_equipment as string[]).join(', ')}.`,
    `Programming: ${(r.programming_languages as string[]).join(', ')}.`,
    `Prior experience: ${(r.prior_experience as string[]).join(', ')}.`,
    `Looking for: ${(r.experience_types as string[]).join(', ')}.`,
    `Year: ${r.year}. Major: ${(r.major as string[]).join(', ')}.`,
  ].join(' ')
}

function buildPostingText(r: Record<string, unknown>): string {
  return [
    `Title: ${r.title}.`,
    `Fields: ${(r.required_skills as string[]).join(', ')}.`,
    `Tags: ${(r.preferred_skills as string[]).join(', ')}.`,
    `Required skills: ${(r.required_skills as string[]).join(', ')}.`,
    `Preferred skills: ${(r.preferred_skills as string[]).join(', ')}.`,
    `Duration: ${r.duration}. Hours: ${r.hours_per_week}/week.`,
    `Preferred year: ${(r.preferred_year as string[]).join(', ')}.`,
  ].join(' ')
}
```

Register three DB Webhooks in Supabase Dashboard → Database → Webhooks:
- Table: `student_profiles`, Events: INSERT, UPDATE → `generate-embedding`
- Table: `role_postings`, Events: INSERT, UPDATE → `generate-embedding`
- Table: `lab_posts`, Events: INSERT, UPDATE → `generate-embedding`

The Edge Function already handles `lab_posts` — add a `buildPostText` branch:

```typescript
// add inside generate-embedding/index.ts
function buildPostText(r: Record<string, unknown>): string {
  return [
    `Lab post caption: ${r.caption}.`,
    `Tags: ${(r.tags as string[]).join(', ')}.`,
  ].join(' ')
}

// update the dispatch:
const text = table === 'student_profiles'
  ? buildStudentText(record)
  : table === 'lab_posts'
  ? buildPostText(record)
  : buildPostingText(record)
```

Set Edge Function secrets:
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
# No Google key needed for embedding — gte-small runs in-process
```

### pgvector Retrieval RPCs

```sql
-- supabase/migrations/013_vector_rpc.sql
CREATE OR REPLACE FUNCTION public.vector_match_role_postings(
  p_student_id uuid,
  p_limit      int DEFAULT 50
)
RETURNS TABLE (
  posting_id   uuid,
  vector_score float4
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    rp.id                              AS posting_id,
    1 - (rp.embedding <=> sp.embedding) AS vector_score
  FROM public.role_postings rp
  CROSS JOIN (
    SELECT embedding FROM public.student_profiles WHERE id = p_student_id
  ) sp
  WHERE rp.status = 'open'
    AND rp.embedding IS NOT NULL
    AND sp.embedding IS NOT NULL
  ORDER BY rp.embedding <=> sp.embedding
  LIMIT p_limit;
$$;

-- Retrieve top-N lab posts most relevant to a student's profile
CREATE OR REPLACE FUNCTION public.vector_match_lab_posts(
  p_student_id uuid,
  p_limit      int DEFAULT 30
)
RETURNS TABLE (
  post_id      uuid,
  vector_score float4
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    lp.id                               AS post_id,
    1 - (lp.embedding <=> sp.embedding) AS vector_score
  FROM public.lab_posts lp
  CROSS JOIN (
    SELECT embedding FROM public.student_profiles WHERE id = p_student_id
  ) sp
  WHERE lp.is_published = true
    AND lp.embedding IS NOT NULL
    AND sp.embedding IS NOT NULL
  ORDER BY lp.embedding <=> sp.embedding
  LIMIT p_limit;
$$;
```

### Gemini Re-rank (Server Action)

```typescript
// lib/matching.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export interface RankedMatch {
  posting_id: string
  rank: number
  reason: string
}

export async function rankMatchesForStudent(studentId: string): Promise<RankedMatch[]> {
  const supabase = await createServerClient()

  // Stage 1: vector shortlist
  const { data: candidates } = await supabase.rpc('vector_match_role_postings', {
    p_student_id: studentId,
    p_limit: 50,
  })
  if (!candidates?.length) return []

  // Fetch student profile
  const { data: student } = await supabase
    .from('student_profiles')
    .select(`
      year, major, research_fields, research_topics, skills,
      lab_equipment, programming_languages, prior_experience,
      experience_types, motivations, priorities, time_commitment, paid_preference
    `)
    .eq('id', studentId)
    .single()

  // Fetch posting details for all candidates
  const postingIds = candidates.map((c: { posting_id: string }) => c.posting_id)
  const { data: postings } = await supabase
    .from('role_postings')
    .select(`
      id, title, description, member_role, is_paid, hours_per_week, duration, start_date,
      required_skills, preferred_skills, preferred_year, preferred_majors,
      min_gpa, gpa_enforcement, priority_courses, lab_environment,
      lab_groups ( name, university, department, research_fields, research_tags, lab_environment )
    `)
    .in('id', postingIds)

  // Stage 2: Gemini re-rank
  const prompt = buildRankingPrompt(student, postings, candidates)

  const res = await fetch(
    `${GEMINI_URL}?key=${process.env.GOOGLE_AI_STUDIO_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
    }
  )

  const json = await res.json()
  const ranked: RankedMatch[] = JSON.parse(
    json.candidates[0].content.parts[0].text
  )

  // Cache results
  const vectorScoreMap = Object.fromEntries(
    candidates.map((c: { posting_id: string; vector_score: number }) =>
      [c.posting_id, c.vector_score]
    )
  )

  await supabase.from('match_cache').upsert(
    ranked.map(r => ({
      student_id:   studentId,
      posting_id:   r.posting_id,
      vector_score: vectorScoreMap[r.posting_id] ?? 0,
      llm_rank:     r.rank,
      llm_reason:   r.reason,
      computed_at:  new Date().toISOString(),
    }))
  )

  return ranked
}

function buildRankingPrompt(
  student: Record<string, unknown>,
  postings: Record<string, unknown>[],
  candidates: { posting_id: string; vector_score: number }[]
): string {
  const vsMap = Object.fromEntries(candidates.map(c => [c.posting_id, c.vector_score]))

  return `
You are a research opportunity matching assistant for a university research platform.
Re-rank these role postings from best to worst fit for this student.

## Student Profile
Year: ${student.year} | Major: ${(student.major as string[]).join(', ')}
Research interests: ${(student.research_fields as string[]).join(', ')}
Specific topics: ${(student.research_topics as string[]).join(', ')}
Skills: ${JSON.stringify(student.skills)}
Equipment experience: ${(student.lab_equipment as string[]).join(', ')}
Programming: ${(student.programming_languages as string[]).join(', ')}
Prior experience: ${(student.prior_experience as string[]).join(', ')}
Looking for: ${(student.experience_types as string[]).join(', ')}
Motivations: ${(student.motivations as string[]).join(', ')}
Priorities: ${(student.priorities as string[]).join(', ')}
Time available: ${student.time_commitment} hrs/week | Paid preference: ${student.paid_preference}

## Role Postings to Rank
${postings.map(p => {
  const lab = p.lab_groups as Record<string, unknown>
  return `
ID: ${p.id}
Title: ${p.title} at ${lab?.name} (${lab?.university}, ${lab?.department})
Fields: ${(lab?.research_fields as string[] | undefined)?.join(', ')}
Tags: ${(lab?.research_tags as string[] | undefined)?.join(', ')}
Required skills: ${(p.required_skills as string[]).join(', ')}
Preferred skills: ${(p.preferred_skills as string[]).join(', ')}
Preferred year: ${(p.preferred_year as string[]).join(', ')}
Hours: ${p.hours_per_week}/week | Paid: ${p.is_paid} | Duration: ${p.duration}
Min GPA: ${p.min_gpa ?? 'none'} (${p.gpa_enforcement ?? 'n/a'})
Vector similarity: ${(vsMap[p.id as string] ?? 0).toFixed(3)}
`}).join('')}

## Instructions
Return a JSON array, best fit first. Each object must have:
- "posting_id": the ID string above
- "rank": integer starting at 1
- "reason": one sentence explaining the fit for THIS specific student

Omit clear mismatches (GPA hard fail, year hard fail, zero skill overlap).
Return valid JSON only — no markdown fences, no text outside the array.
`.trim()
}
```

### `getRecommendedPosts` (Server Action)

```typescript
// lib/matching.ts  (add below rankMatchesForStudent)

export interface RecommendedPost {
  post_id:      string
  vector_score: number
}

export async function getRecommendedPosts(studentId: string): Promise<RecommendedPost[]> {
  const supabase = await createServerClient()

  // Stage 1: vector shortlist — top-30 posts by cosine similarity to student profile
  const { data: candidates } = await supabase.rpc('vector_match_lab_posts', {
    p_student_id: studentId,
    p_limit: 30,
  })
  if (!candidates?.length) return []

  // Deprioritise posts older than 30 days by halving their score
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)

  const scored = candidates.map((c: { post_id: string; vector_score: number }) => {
    // fetch created_at inline — already joined via RPC or fetched separately
    return { post_id: c.post_id, vector_score: c.vector_score }
  })

  // Sort by vector_score descending (recency decay handled when rendering via created_at)
  return scored.sort(
    (a: RecommendedPost, b: RecommendedPost) => b.vector_score - a.vector_score
  )
}
```

---

## 6. Onboarding

Implementation lives in `app/onboarding/*/wizard.tsx` (client) + `actions.ts` (Server Actions).
Draft state is **`useState`** + **`sessionStorage`** (not React Context / `useReducer`). The
final step submits the whole form once (`completeStudentOnboarding` / `completeProfessorOnboarding`).
Autofill: see **Implemented now** (shared `lib/onboarding/*` + `autofill-actions.ts`).

### Student Onboarding (`/onboarding/student`) — 6 steps

All collected fields map to `student_profiles` (and related list columns) on submit. Hidden
form inputs carry the full draft. Autofill can set `parsed_gpa` (hidden) from resume; there is
no `parsed_courses` field in the student UIs. **Step 6** includes honors, publications, and
**file uploads** (profile photo, resume, transcript) via `completeStudentOnboarding` (no user-entered
document URLs in those controls). The public apply flow at `/postings/[id]` uses resume + optional
cover letter file uploads.

**Step 1 — Upload resume (optional)**
- File: `.pdf`, `.txt`, `.md` (10MB max); dropzone UI; client extract + `parseResumeWithLlm("student", …)`
- Stores `resume_file_name` / `resume_url` marker and merges parsed fields into the draft where empty

**Step 2 — Basic info**
- Full name, university (required); current year (select); majors / minors (**tag** input); graduation month, year, GPA (optional text)

**Step 3 — Research interests**
- Research fields, research topics, ranked top interests (**tag** inputs; fields required for Continue)

**Step 4 — Skills**
- Skills (**tag**, required); prior experience (**single** select: none, research lab, hospital volunteering, shadowing, clinical work, independent project); programming languages, lab equipment, software tools (**tags**); experience details (text); relevant courses (**tags**)

**Step 5 — Goals**
- Role types sought (`MultiSelectDropdown`); start availability (text); experience types; priorities; willing to volunteer; GPA visible on profile (yes/no)

**Step 6 — Preferences**
- Time commitment / hours per week (required text); paid preference (`MultiSelectDropdown`); motivations (**tags**);
  honors, publications; file uploads (avatar, resume, transcript) stored via Server Action uploads to `lab-assets`

On completion → `onboarding_complete = true` → redirect to `/dashboard/student`

---

### Professor Onboarding (`/onboarding/professor`) — 5 steps

Collects professor profile fields used before lab creation. Lab creation remains **`/labs/new`**
after onboarding.

**Step 1 — Upload CV (optional)**
- Same file pipeline as student step 1, role `"professor"`; stores `cv_file_name` / `cv_url` marker

**Step 2 — Profile**
- Full name, university (required); title; department; office location; lab website; Google Scholar URL; ORCID (all text fields except selects elsewhere)

**Step 3 — Research**
- Research fields, research keywords (**tags**; fields required for Continue); research summary (textarea); preferred experience level for trainees (select: none / intro courses / prior lab-clinical)

**Step 4 — Mentorship**
- Mentorship style (select: hands-on / independent / collaborative); lab culture (select: fast-paced, collaborative, clinical, computation-heavy, mentorship-focused)

**Step 5 — Preferences**
- Preferred student years and preferred majors (`MultiSelectDropdown`); profile visibility; notify new applications; notify weekly digest

On completion → `onboarding_complete = true` → redirect to `/dashboard/professor`

---

## 7. Deadline Reminders (Edge Function)

Deadline reminders are sent as in-app notifications (and optionally email) when a role
posting's `application_deadline` is approaching and the student has viewed that posting
or has it bookmarked via a follow on the lab.

**Trigger mechanism:** A Supabase Edge Function (`deadline-reminders`) runs on a daily
cron schedule via `pg_cron` (enabled in Supabase dashboard).

```sql
-- Enable pg_cron (run once)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the Edge Function to run every day at 08:00 UTC
SELECT cron.schedule(
  'deadline-reminders-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.edge_function_url') || '/deadline-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    )
  );
  $$
);
```

The Edge Function logic:

```typescript
// supabase/functions/deadline-reminders/index.ts
// Runs daily. Finds open postings with deadlines in 7 days or 3 days,
// then notifies students who have: (a) applied and not yet been decided,
// or (b) follow the lab and haven't applied yet.

serve(async () => {
  const supabase = createClient(...)

  const today = new Date()
  const in7  = addDays(today, 7).toISOString().slice(0, 10)
  const in3  = addDays(today, 3).toISOString().slice(0, 10)

  // Postings expiring in exactly 7 or 3 days
  const { data: postings } = await supabase
    .from('role_postings')
    .select('id, title, application_deadline, lab_id')
    .in('application_deadline', [in7, in3])
    .eq('status', 'open')

  for (const posting of postings ?? []) {
    const daysLeft = posting.application_deadline === in3 ? 3 : 7

    // Students with active applications for this posting
    const { data: applicants } = await supabase
      .from('applications')
      .select('student_id')
      .eq('posting_id', posting.id)
      .in('status', ['submitted', 'reviewing', 'interview'])

    // Students following the lab who haven't applied
    const { data: followers } = await supabase
      .from('lab_follows')
      .select('student_id')
      .eq('lab_id', posting.lab_id)
      .not('student_id', 'in', `(${applicants?.map(a => a.student_id).join(',')})`)

    const targets = [
      ...(applicants ?? []).map(a => a.student_id),
      ...(followers  ?? []).map(f => f.student_id),
    ]

    if (targets.length === 0) continue

    await supabase.from('notifications').insert(
      targets.map(student_id => ({
        user_id: student_id,
        type: 'deadline_reminder',
        payload: {
          posting_id: posting.id,
          title:      posting.title,
          deadline:   posting.application_deadline,
          days_left:  daysLeft,
        },
      }))
    )
  }

  return new Response('ok')
})
```

---

## 7b. Professor-Facing Features


### Professor Dashboard (`/dashboard/professor`)
- Personal profile card (name, title, university)
- "Your Labs" grid — cards for each lab the professor is a member of with role badge
- "Create Lab" CTA — prominent if no labs yet
- Recent activity feed (new applications across all labs, recent acceptances)

### Create Lab Flow (`/labs/new`)
Multi-step form (not a full wizard — fits on 2 pages):

**Page 1 — Lab Identity**
- Lab / research group name
- URL slug (auto-generated, editable)
- University (pre-filled from professor profile, editable)
- Department (dependent dropdown)
- Tagline (one-liner, e.g. "Investigating neuroinflammation in Alzheimer's disease")
- Description (rich text, publicly visible)
- Lab website URL
- Logo upload (Supabase Storage: `lab-assets` bucket)
- Banner image upload (optional)

**Page 2 — Research & Settings**
- Research fields (multi-select)
- Research tags / techniques (free-text tag input)
- Lab environment (multi-select): Hands-on training, Mentorship-heavy, Independent work,
  Clinical/patient-facing, Fast-paced, Computation-heavy, Collaborative
- Require posting approval: toggle (if ON, postings by grad researchers / postdocs go to
  `draft` status until a PI or lab_manager publishes them)

On save:
- Creates `lab_groups` row
- Creates `lab_memberships` row with `lab_role = 'pi'` for the creating professor

### Lab Management Dashboard (`/labs/[labId]`)

Sidebar navigation with sections:

**Overview**
- Public-facing lab profile preview
- Stats: total members, open postings, total applications this month, follower count

**Members** (`/labs/[labId]/members`)
- Table: avatar, name, role badge, university, date joined
- Actions (PI/lab_manager only): Change Role (dropdown), Remove Member
- "Invite Member" button — generates an invite link or sends an email invite to
  another professor's account with a specified lab role

**Role Postings** (`/labs/[labId]/postings`)
- Cards: title, status badge (draft/open/closed), applicant count, deadline
- "New Posting" button
- Quick actions: Open / Close / Archive

**Create / Edit Role Posting** (`/labs/[labId]/postings/new`)
- Title
- Description (rich text — what the student will do, what the lab does, why join)
- **Role type** (what lab role accepted students receive): Undergraduate RA / Graduate RA /
  Lab Technician / Volunteer / Paid Internship / Postdoc
- Paid / Unpaid / Either + hourly rate range (conditional)
- Hours per week (dropdown)
- Duration (text: "One semester", "Ongoing", "Summer 2026")
- Start date (text)
- Spots available (number, optional)
- Application deadline (date, optional)
- Required skills (multi-select + custom)
- Preferred skills (multi-select + custom)
- Preferred year (multi-select)
- Preferred majors (multi-select)
- Minimum experience level (radio)
- Minimum GPA + enforcement (conditional)
- Priority courses (conditional multi-select)
- Evaluation methods (multi-select: Resume, Transcript, Statement of interest,
  Short response questions, Interview)
- Custom screening questions (repeatable: question text + required toggle)
- Publish vs Save Draft toggle

**Applicant Review** (`/labs/[labId]/postings/[postingId]/applicants`)
- Table: applicant name, year, major, GPA (if uploaded), skills match, apply date
- Filter by status tab: All / Submitted / Reviewing / Interview / Accepted / Rejected
- Click row → slide-out drawer:
  - Full student profile (year, major, GPA, skills, experience)
  - Resume viewer (PDF embed)
  - Transcript (if uploaded)
  - Statement + custom question answers
  - Status dropdown: change pipeline stage
  - Reviewer notes (private textarea)
- Bulk actions: Move to Reviewing, Reject selected
- Status change → Server Action → inserts `notifications` row → triggers email Edge Function

**Lab Posts** (`/labs/[labId]/posts`)
- Reverse-chronological grid of the lab's social posts
- "New Post" button (visible to PI, lab_manager, postdoc, grad_researcher)
- Each card shows: first image thumbnail (or caption preview if no image), tags, date,
  author avatar and name
- Quick actions: Edit, Delete (author or PI/manager)

**Create / Edit Post** (`/labs/[labId]/posts/new`)
- Caption (textarea, required — supports line breaks)
- Media uploads (multi-file, images only for now): drag-and-drop or file picker
  → each file uploaded to `post-media` Supabase Storage bucket
  → alt text field per image for accessibility
- Tags (free-text tag input with suggestions from the lab's own `research_tags`)
- Optional external link (URL + display title for link preview card)
- Preview toggle — shows how the post will appear in the student feed
- Publish immediately vs Save as draft (`is_published` toggle)

**Analytics** (`/labs/[labId]/analytics`)

Visible to PI and lab_manager only. All charts are computed server-side from the
`applications` and `lab_follows` tables — no separate analytics store needed.

- **Application volume over time** — bar chart of applications received per week/month,
  filterable by posting; helps labs spot seasonal demand patterns
- **Pipeline funnel** — per-posting funnel: Submitted → Reviewing → Interview → Accepted,
  with drop-off counts at each stage and overall acceptance rate
- **Top applicant universities** — horizontal bar chart of where applicants are coming from
- **Skills gap** — which required skills most applicants are missing (computed from
  `student_profiles.skills` vs `role_postings.required_skills` for each application)
- **Follower growth** — cumulative follower count over time from `lab_follows.followed_at`
- **Post engagement** — per-post view reach (approximated by unique profile visits from
  students who saw the post; stored in a lightweight `post_views` counter column on
  `lab_posts` incremented server-side)

All data queries are plain Postgres aggregations via Server Actions — no third-party
analytics SDK required.

**Lab Settings** (`/labs/[labId]/settings`)
- Edit lab name, description, fields, tags, logo
- Toggle `requires_posting_approval`
- Danger zone: Archive Lab (sets `is_active = false`)

---

## 8. Student-Facing Features

### Student Dashboard (`/dashboard/student`)

**Shipped (Apr 2026):** sidebar navigation (Explore, Applications, Messaging, Lab management, My profile), top search → `/dashboard/student/search`, Explore home with matched-role row + Discovery placeholder — see **“Implemented now”** at the top of this doc.

**Target UX (below):** original tabbed shell — **Feed · Discover · Applications · My Labs** — plus feed/discover features still largely roadmap.

**Profile Completeness Banner**

Shown at the top of the dashboard (below the tab bar) until the score reaches 100%.
Computed client-side from the student's profile fields:

| Section | Points |
|---|---|
| Basic info (university, major, year, graduation) | 15 |
| Research interests (≥ 2 fields selected) | 10 |
| Research topics (≥ 3 tags) | 10 |
| Skills (≥ 3 skills with proficiency) | 15 |
| Experience (≥ 1 entry or type selected) | 10 |
| Resume uploaded | 20 |
| Transcript uploaded | 10 |
| Preferences (role type + time commitment + paid preference) | 10 |

The banner shows: circular progress ring, percentage, and the single highest-value
missing section as a CTA ("Add your resume to boost your match quality +20pts").
Clicking the CTA deep-links directly into the relevant onboarding step.
Score is recomputed on every dashboard load from the live `student_profiles` row —
no stored column needed.

---

**Feed Tab** (default landing tab)

The home feed mixes two content types in a single ranked stream, with content from
**followed labs always appearing first**, followed by AI-recommended content:

1. **Followed-lab posts** — newest posts from labs the student follows, sorted by `followed_at` recency
2. **Followed-lab new postings** — open role postings published in the last 14 days from followed labs
3. **Recommended lab posts** — posts from unfollowed labs, ranked by `vector_score DESC` with a 30-day recency decay
4. **Recommended new listings** — open postings from the last 7 days ranked by `llm_rank`

Each social post card shows:
- Lab logo + name + university + **Follow / Following** button
- Caption (truncated with "Read more" expand)
- Image(s) in a horizontal scroll strip (if present)
- Tags as chips
- Link preview card (if `link_url` set)
- Date posted

Follow / Unfollow is a single Server Action toggle on `lab_follows` — optimistic UI
update so the button responds instantly.

Search bar above the feed queries both `lab_posts.fts` and `role_postings.fts`
simultaneously, returning a merged result set with type labels ("Post" / "Opportunity").

On first visit (embedding not yet generated): skeleton loader with copy
"Personalising your feed…" while the Edge Function runs.

**Discover Tab**
- AI-matched role listings only, sorted by `llm_rank`
- Each card: lab logo + name + university, role title, field tags, paid badge,
  hours/week, Gemini match reason, **Follow / Following** button on the lab
- Filter sidebar: research field, role type, paid/unpaid, hours, year preference, university
- Search queries `role_postings.fts`

**My Applications Tab** (`/dashboard/student/applications`)
- Timeline view grouped by posting
- Status chip: Submitted → Reviewing → Interview → Accepted / Rejected / Withdrawn
- **Deadline reminder chip** on each active application: shows days remaining if the
  posting has an `application_deadline`; turns amber at ≤ 7 days, red at ≤ 3 days
- Supabase Realtime subscription on `applications` filtered to `student_id = me`
- "Withdraw" action for submitted/reviewing applications

**My Labs Tab** (`/dashboard/student/labs`)
- Cards for each lab the student has been accepted into
- Shows: lab name, logo, student's role within the lab, date joined
- Click → `/labs/[labId]` (read-only member view: Overview + Members tabs only)

### Apply Flow

Posting detail page (`/postings/[id]`) renders an inline apply form:
1. Resume selection/upload:
   - If student has a profile resume, they can choose profile resume or upload a new PDF
   - If no profile resume exists, resume PDF upload is required
2. Cover letter upload (PDF, optional; currently persisted in `applications.transcript_url`)
3. Statement of interest (textarea, shown if `eval_methods` includes `statement_of_interest`)
4. Custom question fields (rendered from `custom_questions` JSONB)
5. Submit → Server Action:
   - Inserts `applications` row
   - Inserts `application_submitted` notification for all PI/lab_manager members of the lab
   - Invalidates match cache for this student (they already applied — hide from feed)

---

## 9. TypeScript Types

```typescript
// lib/types.ts

export interface Profile {
  id:                  string
  role:                Role
  display_name:        string | null
  avatar_url:          string | null
  email:               string
  is_verified:         boolean
  onboarding_complete: boolean
  created_at:          string
}

export type Role = 'student' | 'professor'
export type Year = 'freshman' | 'sophomore' | 'junior' | 'senior' | 'graduate' | 'other'
export type Proficiency = 'beginner' | 'intermediate' | 'advanced'
export type LabRole =
  | 'pi' | 'lab_manager' | 'postdoc' | 'grad_researcher'
  | 'undergrad_ra' | 'lab_technician' | 'volunteer'
export type ApplicationStatus =
  | 'submitted' | 'reviewing' | 'interview' | 'accepted' | 'rejected' | 'withdrawn'
export type PostingStatus = 'draft' | 'open' | 'closed' | 'archived'

export interface PostMedia {
  url:   string   // Supabase Storage path in post-media bucket
  type:  'image'
  alt:   string
}

export interface Skill {
  name: string
  proficiency: Proficiency
  category?: 'lab_technique' | 'programming' | 'equipment' | 'software' | 'other'
}
export interface ParsedCourse  { name: string; grade: string; credits: number }
export interface ExperienceDetail {
  role: string
  organization: string
  duration: string
  description: string
}
export interface CustomQuestion { id: string; prompt: string; required: boolean }

export interface RankedMatch {
  posting_id:   string
  vector_score: number
  llm_rank:     number
  llm_reason:   string
}

// Lab permission helper (derive from LabRole)
export const CAN_EDIT_LAB       = new Set<LabRole>(['pi', 'lab_manager'])
export const CAN_MANAGE_MEMBERS = new Set<LabRole>(['pi', 'lab_manager'])
export const CAN_CREATE_POSTING = new Set<LabRole>(['pi', 'lab_manager', 'postdoc', 'grad_researcher'])
export const CAN_REVIEW_APPS    = new Set<LabRole>(['pi', 'lab_manager', 'postdoc', 'grad_researcher'])

export interface StudentProfile {
  id: string
  full_name: string | null
  university: string | null
  major: string[]
  minor: string[]
  year: Year | null
  graduation_month: number | null
  graduation_year: number | null
  gpa: number | null
  is_gpa_visible: boolean
  research_fields: string[]
  research_topics: string[]
  ranked_interests: string[]
  skills: Skill[]
  programming_languages: string[]
  lab_equipment: string[]
  software_tools: string[]
  prior_experience: string[]
  experience_details: ExperienceDetail[]
  transcript_url: string | null
  parsed_gpa: number | null
  parsed_courses: ParsedCourse[]
  resume_url: string | null
  role_types_sought: string[]
  time_commitment: string | null
  paid_preference: string | null
  start_availability: string | null
  experience_types: string[]
  motivations: string[]
  priorities: string[]
  relevant_courses: string[]
}

export interface ProfessorProfile {
  id: string
  full_name: string | null
  title: string | null
  university: string | null
  department: string | null
  office_location: string | null
  lab_website: string | null
  google_scholar_url: string | null
  orcid: string | null
  research_fields: string[]
  research_keywords: string[]
  research_summary: string | null
  preferred_student_year: string[]
  preferred_majors: string[]
  preferred_experience_level: string | null
  mentorship_style: string[]
  lab_culture: string[]
  profile_visibility: 'public' | 'university_only'
  notify_new_applications: boolean
  notify_weekly_digest: boolean
}

export interface LabGroup {
  id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  university: string
  department: string | null
  logo_url: string | null
  banner_url: string | null
  research_fields: string[]
  research_tags: string[]
  lab_environment: string[]
  requires_posting_approval: boolean
  is_active: boolean
  // joined
  lab_memberships?: LabMembership[]
}

export interface LabMembership {
  id: string
  lab_id: string
  user_id: string
  lab_role: LabRole
  joined_at: string
  is_active: boolean
  // joined
  profiles?: Pick<Profile, 'display_name' | 'avatar_url' | 'email'>
}

export interface RolePosting {
  id: string
  lab_id: string
  title: string
  description: string | null
  status: PostingStatus
  member_role: LabRole
  is_paid: string | null
  hourly_rate_range: string | null
  hours_per_week: string | null
  duration: string | null
  start_date: string | null
  spots_available: number | null
  required_skills: string[]
  preferred_skills: string[]
  preferred_year: string[]
  preferred_majors: string[]
  min_gpa: number | null
  eval_methods: string[]
  custom_questions: CustomQuestion[]
  application_deadline: string | null
  created_at: string
  // joined
  lab_groups?: Pick<LabGroup, 'name' | 'slug' | 'university' | 'department' | 'logo_url' | 'lab_environment'>
  match_cache?: RankedMatch
}

export interface Application {
  id: string
  posting_id: string
  student_id: string
  status: ApplicationStatus
  resume_url: string | null
  transcript_url: string | null // currently used for optional cover letter upload
  statement: string | null
  custom_responses: Record<string, string>
  created_at: string
  // joined
  role_postings?: Pick<RolePosting, 'title' | 'lab_id'>
  student_profiles?: Pick<StudentProfile, 'full_name' | 'university' | 'year' | 'major' | 'parsed_gpa' | 'skills'>
}

export interface LabFollow {
  student_id:  string
  lab_id:      string
  followed_at: string
}

export interface ProfileCompletenessScore {
  total:    number   // 0–100
  sections: {
    basic_info:     number
    interests:      number
    topics:         number
    skills:         number
    experience:     number
    resume:         number
    transcript:     number
    preferences:    number
  }
  next_cta: { label: string; points: number; step: number } | null
}

export interface LabPost {
  id: string
  lab_id: string
  author_id: string
  caption: string
  media: PostMedia[]
  tags: string[]
  link_url: string | null
  link_title: string | null
  is_published: boolean
  created_at: string
  updated_at: string
  // joined
  lab_groups?: Pick<LabGroup, 'name' | 'slug' | 'logo_url' | 'university'>
  profiles?: Pick<Profile, 'display_name' | 'avatar_url'>    // author
  // from vector RPC
  vector_score?: number
}

// Union type for the mixed Feed tab
export type FeedItem =
  | { type: 'post';    data: LabPost }
  | { type: 'posting'; data: RolePosting }
```

---

## 10. UI & Design System

- **Tailwind CSS v4** + **shadcn/ui** as the primary component system
- **Brand logo asset:** use `public/lablinkLogo.svg` for LabLink logo rendering

### Color Palette

| CSS Variable | Tailwind Class | Hex | Usage |
|---|---|---|---|
| `--ll-purple` | `ll-purple` | `#C593EE` | Primary CTA buttons, student-role accents, active nav states, match-score badges, wizard step indicators, student navbar |
| `--ll-navy` | `ll-navy` | `#003E48` | Professor-role accents, lab detail panel headers, professor navbar, dark card backgrounds |
| `--ll-gray` | `ll-gray` | `#5F5E5E` | Body text, secondary labels, input placeholders, muted metadata |
| `--ll-bg` | `ll-bg` | `#E4FBFF` | Page backgrounds, light card fills, search bar background |
| (white) | `white` | `#FFFFFF` | Card surfaces, modal backgrounds, form fields |

Tailwind v4 has no `tailwind.config.ts` — all theming lives in `app/globals.css`. Add to `:root` and expose via `@theme inline`:

```css
/* app/globals.css */
:root {
  --ll-purple: #C593EE;
  --ll-navy:   #003E48;
  --ll-gray:   #5F5E5E;
  --ll-bg:     #E4FBFF;
}

@theme inline {
  --color-ll-purple: var(--ll-purple);
  --color-ll-navy:   var(--ll-navy);
  --color-ll-gray:   var(--ll-gray);
  --color-ll-bg:     var(--ll-bg);
}
```

Use in components as `bg-ll-purple`, `text-ll-navy`, `bg-ll-bg`, etc.

### Typography

- **Font:** Afacad via `next/font/google` — loaded as `--font-sans`, weights 400/500/600/700
- Hero headings: `text-5xl font-bold tracking-tight`
- Section headings: `text-xl font-semibold uppercase tracking-widest text-ll-gray`
- Body: `text-sm text-ll-gray`
- Metadata / badges: `text-xs font-semibold uppercase tracking-wider`

### Layout & Navigation

- **Navbar color is role-contextual:**
  - Landing page / unauthenticated → `bg-[#003E48]` dark navy
  - Student-context pages → `bg-[#C593EE]` purple navbar
  - Professor-context pages → `bg-[#003E48]` dark navy navbar
- **Authenticated app shell:** fixed left sidebar (240 px) with icon + label nav links; collapses to bottom tab bar on mobile
- Sidebar background: white with `border-r border-gray-200`; active item has `bg-purple/10 text-purple font-semibold`

### Aesthetic Direction

Clean and minimal with high contrast accents. Pages feel open — generous whitespace, `#E4FBFF` backgrounds, white card surfaces. Bold sans-serif headings create strong visual hierarchy. Interactive elements (buttons, badges, active states) punch with purple or navy depending on context; everything else recedes into gray.

Key aesthetic rules:
- **Dual-tone role identity:** student-facing surfaces accent with purple; professor/lab-facing surfaces accent with navy. Nav bar color follows the same rule.
- **Cards with imagery:** lab cards use a photo background with a dark gradient overlay and white text on top — gives the app a editorial, magazine-like feel rather than a pure data dashboard.
- **Uppercase micro-labels:** section labels, badge text, and metadata use `text-xs font-semibold uppercase tracking-widest text-[#5F5E5E]` — creates clear visual hierarchy without extra size.
- **Rounded everything:** buttons, cards, badges, chips all use generous border-radius (`rounded-xl` for cards, `rounded-full` for pills/badges).
- **Match badges:** solid purple pill with white bold text, e.g. "95% MATCH" — the primary attention-grabbing element on discovery surfaces.
- **Ghost / outline secondary actions:** "Save", "Back", secondary CTAs use outline style against the purple/navy primary so the hierarchy is always clear.
- **Skill chips:** small rounded pill, light gray fill, gray text — unobtrusive but scannable.

### Component Inventory

**Always prefer shadcn/ui components and blocks first.** Only build a custom component when shadcn has no equivalent. shadcn components live in `components/ui/` and are fully owned/editable — restyle them via the CSS variable tokens (`--ll-purple`, etc.) rather than forking the logic.

shadcn components to install and use:
- Layout / navigation: `Sidebar`, `NavigationMenu`, `Tabs`, `Breadcrumb`
- Inputs: `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`, `Slider`, `Form` (react-hook-form wrapper)
- Overlays: `Dialog`, `Drawer`, `Sheet`, `Popover`, `Tooltip`, `DropdownMenu`
- Display: `Card`, `Badge`, `Avatar`, `Separator`, `Skeleton`, `Progress`, `Table`
- Feedback: `Toast` (Sonner), `Alert`

shadcn **blocks** to use as starting points (adapt to LabLink colors/content rather than building from scratch):
- Authentication pages (`login-01` / `login-02` block) → sign-in / sign-up pages
- Dashboard sidebar layout block → authenticated app shell
- Settings / profile form block → onboarding wizard steps and profile edit pages
- Data table block → applicant review table, members table

Custom components (no shadcn equivalent) in `components/`:
- `LabRoleBadge` — role pill with navy/purple/gray tier colors
- `MatchBadge` — "95% MATCH" purple pill
- `SkillChip` — light gray tag pill
- `HeroImageCard` — image-backed card with dark gradient overlay (lab cards in grid/discovery)
- `StepWizard` — multi-step wizard shell with step indicator sidebar
- `SplitPanel` — left list + right detail panel layout (discovery page)

`LabRoleBadge` color tiers:
- PI / Lab Manager → `bg-ll-navy text-white`
- Postdoc / Grad Researcher → `bg-ll-purple/20 text-ll-purple`
- Undergrad RA / Lab Tech / Volunteer → `bg-gray-100 text-ll-gray`

### Accessibility

- Keyboard navigable, ARIA labels on all custom controls
- Color contrast ratio ≥ 4.5:1 for all text on `#E4FBFF` and `#C593EE` backgrounds (verify with Tailwind contrast plugin)

---

## 11. Routes

```
/                                                  Marketing landing page (hero, how it works, CTA)
/auth/role-select                                  Role picker — "I'm a Student" / "I'm a Professor"
/auth/sign-up                                      Credentials form (reads ?role= from query param)
/auth/sign-in                                      Sign-in form (reads optional ?role= for UI hints)
/auth/callback                                     Supabase magic-link / OAuth callback

/onboarding/student                                6-step student wizard (`wizard.tsx` + `actions.ts`)
/onboarding/professor                              5-step professor wizard (`wizard.tsx` + `actions.ts`)

/dashboard/student                                 Explore home (matched roles row + discovery placeholder)
/dashboard/student/search                          Semantic role search (?q=)
/dashboard/student/applications                      Applications list
/dashboard/student/labs                            Student lab memberships ("Lab management")
/dashboard/student/messaging                       Placeholder
/dashboard/student/profile                         Full student profile (all `student_profiles` + identity fields; file uploads for avatar, resume, transcript — no user-entered file URLs in UI)
/dashboard/professor                               Lab grid + recent activity

/labs/new                                          Create lab group (2-page form)
/labs/[labId]                                      Lab overview (public + member view) + Follow button
/labs/[labId]/members                              Members table (management view)
/labs/[labId]/postings                             Posting list (management view)
/labs/[labId]/postings/new                         Create posting
/labs/[labId]/postings/[postingId]                 Edit posting
/labs/[labId]/postings/[postingId]/applicants      Review applicants (status + **recommended** tab: `vector_match_students_for_posting` + `lib/posting-student-matching.ts` LLM rerank among **current applicants**; filter dropdowns; name → read-only same layout as student My Profile)
/labs/[labId]/postings/[postingId]/applicants/[studentId]  Applicant’s student profile (read-only My Profile component)
/labs/[labId]/posts                                Lab social posts list (management)
/labs/[labId]/posts/new                            Create post
/labs/[labId]/posts/[postId]                       Edit post
/labs/[labId]/analytics                            Pipeline + follower analytics (PI/manager only)
/labs/[labId]/settings                             Lab settings

/postings/[id]                                     Posting detail + inline apply (student-only; file uploads, no document URL fields in form)
/posts/[id]                                        Public social post permalink

/profile/student/[id]                              Public student profile
/profile/professor/[id]                            Public professor profile
```

---

## 12. File & Folder Structure

```
lablink/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                                     # landing
│   ├── auth/
│   │   ├── role-select/page.tsx                     # two large cards: Student / Professor
│   │   ├── sign-up/page.tsx                         # reads searchParams.role; stores in form + meta
│   │   ├── sign-in/page.tsx                         # reads optional searchParams.role for UI hints
│   │   └── callback/route.ts
│   ├── onboarding/
│   │   ├── autofill-actions.ts                      # "use server": parseResumeWithLlm (+ Gemini + heuristic)
│   │   ├── student/
│   │   │   ├── page.tsx                             # mounts `StudentOnboardingWizard`
│   │   │   ├── wizard.tsx                           # client: steps, sessionStorage, file autofill
│   │   │   └── actions.ts                           # completeStudentOnboarding
│   │   └── professor/
│   │       ├── page.tsx                             # mounts `ProfessorOnboardingWizard`
│   │       ├── wizard.tsx
│   │       └── actions.ts                           # completeProfessorOnboarding
│   ├── dashboard/
│   │   ├── student/                                 # layout + Explore, applications, messaging, labs, profile, search routes
│   │   └── professor/page.tsx                       # lab grid + activity
│   ├── labs/
│   │   ├── new/page.tsx
│   │   └── [labId]/
│   │       ├── page.tsx                             # overview
│   │       ├── members/page.tsx
│   │       ├── postings/
│   │       │   ├── page.tsx
│   │       │   ├── new/page.tsx
│   │       │   └── [postingId]/
│   │       │       ├── page.tsx                     # edit
│   │       │       └── applicants/page.tsx
│   │       ├── posts/
│   │       │   ├── page.tsx                         # lab post list (management)
│   │       │   ├── new/page.tsx                     # create post
│   │       │   └── [postId]/page.tsx                # edit post
│   │       ├── analytics/page.tsx                   # pipeline + follower analytics
│   │       └── settings/page.tsx
│   ├── postings/
│   │   └── [id]/page.tsx                            # public detail + apply
│   ├── posts/
│   │   └── [id]/page.tsx                            # public post permalink
│   └── profile/
│       ├── student/[id]/page.tsx
│       └── professor/[id]/page.tsx
│
├── components/
│   ├── ui/                                          # e.g. button primitive
│   ├── site-navbar.tsx
│   ├── multi-select-dropdown.tsx                    # shared multiselect (onboarding + elsewhere)
│   └── student/                                     # student dashboard shell: sidebar, top search, search browser
│
├── docs/
│   ├── plan.md                                      # this file
│   ├── sample-student-resume.md                     # synthetic resume for autofill testing
│   └── sample-professor-cv.md                       # synthetic CV for autofill testing
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts                            # session refresh (used from root `middleware.ts`)
│   ├── onboarding/
│   │   ├── autofill.ts                              # buildStudentAutofill / buildProfessorAutofill heuristics
│   │   ├── extract-text-from-file.ts                # "use client": PDF + text extraction (bounded)
│   │   └── parse-onboarding-file.ts                 # "use client": 10MB check → extract → server autofill
│   ├── matching.ts                                  # rankMatchesForStudent, search re-rank, etc.
│   ├── embeddings.ts                                # requestEmbeddingRefresh, etc.
│   └── utils.ts
│
├── middleware.ts
│
└── supabase/
    ├── migrations/                                  # 001–013 SQL files (013 adds pg_cron schedule)
    └── functions/
        ├── generate-embedding/index.ts
        ├── send-status-email/index.ts
        └── deadline-reminders/index.ts
```

---

## 13. Build Order

1. Supabase project + all 13 migrations (including `vector` + `pg_cron` extensions) + env vars + client helpers + middleware
2. Auth: role-select page + sign-up/sign-in/callback + `handle_new_user` trigger; guard `/auth/sign-up` against missing `?role` param
3. Student onboarding: all 6 steps + `wizard.tsx` + `completeStudentOnboarding` Server Action
4. Professor onboarding: all 5 steps + `wizard.tsx` + `completeProfessorOnboarding` Server Action
5. Landing page
6. Lab creation flow (`/labs/new`) + lab overview page with Follow / Unfollow button
7. Lab management: Members tab, Postings list, Create/Edit Posting form
8. Posting detail page + Apply modal + application Server Action
9. Professor applicant review: table, drawer, status update + `handle_application_accepted` trigger verification
10. Student dashboard: Profile Completeness banner (`computeProfileCompleteness()`) + My Applications (Realtime, deadline chips) + My Labs + Discover tabs
11. Lab following: `lab_follows` table + Follow/Unfollow Server Action + feed prioritisation of followed-lab content + `posting_published` / `new_lab_post` notifications to followers
12. Lab Posts: Create/Edit Post form + media upload to `post-media` bucket + lab posts management tab + public permalink
13. Edge Function: `generate-embedding` with `student_profiles`, `role_postings`, and `lab_posts` branches + all three DB webhooks
14. Vector feed: `vector_match_role_postings` RPC + `rankMatchesForStudent` Gemini call + Discover tab; `vector_match_lab_posts` RPC + `getRecommendedPosts` + Feed tab (mixed stream, followed labs first)
15. Search: unified search bar querying both `role_postings.fts` and `lab_posts.fts`, merged result set
16. Pipeline analytics: aggregation queries for application funnel, skills gap, follower growth, post views counter + `/labs/[labId]/analytics` page
17. Deadline reminders: `deadline-reminders` Edge Function + `pg_cron` daily schedule + `deadline_reminder` notification type
18. Notifications: Realtime bell + all notification types wired in Server Actions
19. Email Edge Function: status-change + deadline reminder transactional emails
20. Polish: permissions helper, `LabRoleBadge`, `FeedItem` union renderer, empty states, mobile audit, error boundaries

---

## 14. Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Server-only
GOOGLE_AI_STUDIO_API_KEY=...    # Gemini re-ranking only — embeddings use Supabase AI (no key needed)
```

```bash
# Supabase Edge Function secrets
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
# GOOGLE_AI_STUDIO_API_KEY is NOT needed in Edge Functions — gte-small runs in-process
```

## 15. Dependencies to Install

```bash
# Supabase
npm install @supabase/supabase-js @supabase/ssr

# shadcn/ui — already initialised (globals.css imports shadcn/tailwind.css)
# Use the shadcn MCP in Cursor to add components — it handles registry lookup,
# installs the component files, and wires up dependencies automatically.
# Manual fallback if needed:
npx shadcn@latest add button input textarea select checkbox switch slider form
npx shadcn@latest add dialog drawer sheet popover tooltip dropdown-menu
npx shadcn@latest add card badge avatar separator skeleton progress table tabs
npx shadcn@latest add sidebar navigation-menu breadcrumb
npx shadcn@latest add sonner alert

# Other
npm install pdfjs-dist                        # transcript PDF parsing (client-side)
npm install @dnd-kit/core @dnd-kit/sortable   # drag-to-rank interests in onboarding
```
