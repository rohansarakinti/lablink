-- Core identity tables (must exist before 20260421_lab_management_foundation references public.profiles).
-- Safe to re-run: creates objects only if missing.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('student', 'professor')),
  display_name text,
  avatar_url text,
  email text,
  is_verified boolean not null default false,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create index if not exists idx_profiles_role on public.profiles (role);

alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Anyone can view profiles'
  ) then
    create policy "Anyone can view profiles"
      on public.profiles for select using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users update own profile'
  ) then
    create policy "Users update own profile"
      on public.profiles for update using (auth.uid() = id);
  end if;
end $$;

-- Student extended profile (matches app Server Actions; skills as text[] from onboarding toList)
create table if not exists public.student_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  full_name text,
  university text,
  major text[] not null default '{}',
  minor text[] not null default '{}',
  year text,
  graduation_month smallint,
  graduation_year smallint,
  gpa numeric(3,2),
  is_gpa_visible boolean not null default true,
  research_fields text[] not null default '{}',
  research_topics text[] not null default '{}',
  ranked_interests text[] not null default '{}',
  skills text[] not null default '{}',
  programming_languages text[] not null default '{}',
  lab_equipment text[] not null default '{}',
  software_tools text[] not null default '{}',
  prior_experience text[] not null default '{}',
  experience_details text,
  transcript_url text,
  parsed_gpa numeric(3,2),
  parsed_courses text,
  resume_url text,
  experience_types text[] not null default '{}',
  priorities text[] not null default '{}',
  relevant_courses text[] not null default '{}',
  role_types_sought text[] not null default '{}',
  time_commitment text,
  paid_preference text,
  motivations text[] not null default '{}',
  start_availability text,
  honors_or_awards text,
  publications text,
  willing_to_volunteer boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists student_profiles_updated_at on public.student_profiles;
create trigger student_profiles_updated_at
before update on public.student_profiles
for each row execute function public.set_updated_at();

create index if not exists idx_sp_university on public.student_profiles (university);
create index if not exists idx_sp_research on public.student_profiles using gin (research_fields);

alter table public.student_profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'student_profiles' and policyname = 'Students manage own student profile'
  ) then
    create policy "Students manage own student profile"
      on public.student_profiles for all using (auth.uid() = id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'student_profiles' and policyname = 'Professors can read student profiles'
  ) then
    create policy "Professors can read student profiles"
      on public.student_profiles for select
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'professor'));
  end if;
end $$;

create table if not exists public.professor_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  full_name text,
  title text,
  university text,
  department text,
  office_location text,
  lab_website text,
  cv_url text,
  google_scholar_url text,
  orcid text,
  research_fields text[] not null default '{}',
  research_keywords text[] not null default '{}',
  research_summary text,
  preferred_student_year text[] not null default '{}',
  preferred_majors text[] not null default '{}',
  preferred_experience_level text,
  mentorship_style text[] not null default '{}',
  lab_culture text[] not null default '{}',
  profile_visibility text not null default 'public' check (profile_visibility in ('public', 'university_only')),
  notify_new_applications boolean not null default true,
  notify_weekly_digest boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists professor_profiles_updated_at on public.professor_profiles;
create trigger professor_profiles_updated_at
before update on public.professor_profiles
for each row execute function public.set_updated_at();

create index if not exists idx_prof_university on public.professor_profiles (university);

alter table public.professor_profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'professor_profiles' and policyname = 'Professors manage own professor profile'
  ) then
    create policy "Professors manage own professor profile"
      on public.professor_profiles for all using (auth.uid() = id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'professor_profiles' and policyname = 'Anyone can read professor profiles'
  ) then
    create policy "Anyone can read professor profiles"
      on public.professor_profiles for select using (true);
  end if;
end $$;

-- Graceful column adds for DBs created before parsed_courses existed
alter table public.student_profiles add column if not exists parsed_courses text;
