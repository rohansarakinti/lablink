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

create table if not exists public.lab_groups (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  tagline text,
  description text,
  university text not null,
  department text,
  website_url text,
  logo_url text,
  banner_url text,
  research_fields text[] not null default '{}',
  research_tags text[] not null default '{}',
  lab_environment text[] not null default '{}',
  requires_posting_approval boolean not null default false,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists lab_groups_updated_at on public.lab_groups;
create trigger lab_groups_updated_at
before update on public.lab_groups
for each row execute function public.set_updated_at();

create index if not exists idx_lab_university on public.lab_groups(university);
create index if not exists idx_lab_fields on public.lab_groups using gin(research_fields);
create index if not exists idx_lab_tags on public.lab_groups using gin(research_tags);

alter table public.lab_groups enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lab_groups' and policyname = 'Anyone can view active labs'
  ) then
    create policy "Anyone can view active labs"
      on public.lab_groups for select using (is_active = true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lab_groups' and policyname = 'PI and lab_manager can update lab'
  ) then
    create policy "PI and lab_manager can update lab"
      on public.lab_groups for update
      using (created_by = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lab_groups' and policyname = 'Professors can create labs'
  ) then
    create policy "Professors can create labs"
      on public.lab_groups for insert
      with check (
        auth.uid() = created_by
        and exists (select 1 from public.profiles where id = auth.uid() and role = 'professor')
      );
  end if;
end $$;

create table if not exists public.lab_memberships (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references public.lab_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  lab_role text not null check (lab_role in (
    'pi',
    'lab_manager',
    'postdoc',
    'grad_researcher',
    'undergrad_ra',
    'lab_technician',
    'volunteer'
  )),
  application_id uuid,
  joined_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (lab_id, user_id)
);

create index if not exists idx_lm_lab_id on public.lab_memberships(lab_id);
create index if not exists idx_lm_user_id on public.lab_memberships(user_id);

alter table public.lab_memberships enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lab_memberships' and policyname = 'Lab members can view membership list'
  ) then
    create policy "Lab members can view membership list"
      on public.lab_memberships for select
      using (
        user_id = auth.uid()
        or exists (
          select 1
          from public.lab_groups lg
          where lg.id = public.lab_memberships.lab_id
            and lg.created_by = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lab_memberships' and policyname = 'PI and lab_manager can manage members'
  ) then
    create policy "PI and lab_manager can manage members"
      on public.lab_memberships for insert
      with check (
        exists (
          select 1
          from public.lab_groups lg
          where lg.id = public.lab_memberships.lab_id
            and lg.created_by = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lab_groups' and policyname = 'PI and lab_manager can update lab'
  ) then
    drop policy "PI and lab_manager can update lab" on public.lab_groups;
  end if;

  create policy "PI and lab_manager can update lab"
    on public.lab_groups for update
    using (
      exists (
        select 1 from public.lab_memberships
        where lab_id = public.lab_groups.id
          and user_id = auth.uid()
          and lab_role in ('pi','lab_manager')
          and is_active = true
      )
    );
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lab_memberships' and policyname = 'PI and lab_manager can update member roles'
  ) then
    create policy "PI and lab_manager can update member roles"
      on public.lab_memberships for update
      using (
        exists (
          select 1
          from public.lab_groups lg
          where lg.id = public.lab_memberships.lab_id
            and lg.created_by = auth.uid()
        )
      );
  end if;
end $$;

create table if not exists public.role_postings (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references public.lab_groups(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft','open','closed','archived')),
  application_deadline date,
  member_role text not null check (member_role in (
    'undergrad_ra','grad_researcher','postdoc','lab_technician','volunteer'
  )),
  is_paid text check (is_paid in ('paid','unpaid','either')),
  hourly_rate_range text,
  hours_per_week text check (hours_per_week in ('<5','5-10','10-20','20+')),
  duration text,
  start_date text,
  spots_available smallint,
  required_skills text[] not null default '{}',
  preferred_skills text[] not null default '{}',
  preferred_year text[] not null default '{}',
  preferred_majors text[] not null default '{}',
  min_experience text check (min_experience in ('none','intro_courses','prior_experience')),
  min_gpa numeric(3,2),
  gpa_enforcement text check (gpa_enforcement in ('strict','preferred','holistic')),
  priority_courses text[] not null default '{}',
  eval_methods text[] not null default '{}',
  custom_questions jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists role_postings_updated_at on public.role_postings;
create trigger role_postings_updated_at
before update on public.role_postings
for each row execute function public.set_updated_at();

create index if not exists idx_role_postings_lab_id on public.role_postings(lab_id);
create index if not exists idx_role_postings_status on public.role_postings(status);

alter table public.role_postings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'role_postings' and policyname = 'Anyone can view open postings'
  ) then
    create policy "Anyone can view open postings"
      on public.role_postings for select using (status = 'open');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'role_postings' and policyname = 'Lab managers can view all postings'
  ) then
    create policy "Lab managers can view all postings"
      on public.role_postings for select using (
        exists (
          select 1 from public.lab_memberships lm
          where lm.lab_id = public.role_postings.lab_id
            and lm.user_id = auth.uid()
            and lm.is_active = true
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'role_postings' and policyname = 'PI and lab_manager can manage postings'
  ) then
    create policy "PI and lab_manager can manage postings"
      on public.role_postings for all
      using (
        exists (
          select 1 from public.lab_memberships lm
          where lm.lab_id = public.role_postings.lab_id
            and lm.user_id = auth.uid()
            and lm.lab_role in ('pi','lab_manager')
            and lm.is_active = true
        )
      )
      with check (
        exists (
          select 1 from public.lab_memberships lm
          where lm.lab_id = public.role_postings.lab_id
            and lm.user_id = auth.uid()
            and lm.lab_role in ('pi','lab_manager')
            and lm.is_active = true
        )
      );
  end if;
end $$;

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  posting_id uuid not null references public.role_postings(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  status text not null default 'submitted' check (status in (
    'submitted','reviewing','interview','accepted','rejected','withdrawn'
  )),
  status_updated_at timestamptz not null default now(),
  resume_url text,
  transcript_url text,
  statement text,
  custom_responses jsonb not null default '{}',
  reviewer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (posting_id, student_id)
);

drop trigger if exists applications_updated_at on public.applications;
create trigger applications_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

create or replace function public.sync_application_status_time()
returns trigger language plpgsql as $$
begin
  if old.status is distinct from new.status then
    new.status_updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists applications_status_time on public.applications;
create trigger applications_status_time
before update on public.applications
for each row execute function public.sync_application_status_time();

create index if not exists idx_app_posting on public.applications(posting_id);
create index if not exists idx_app_student on public.applications(student_id);
create index if not exists idx_app_status on public.applications(status);

alter table public.applications enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'applications' and policyname = 'Students manage own applications'
  ) then
    create policy "Students manage own applications"
      on public.applications for all using (auth.uid() = student_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'applications' and policyname = 'Authorized lab members view applications'
  ) then
    create policy "Authorized lab members view applications"
      on public.applications for select
      using (
        exists (
          select 1
          from public.role_postings rp
          join public.lab_memberships lm on lm.lab_id = rp.lab_id
          where rp.id = public.applications.posting_id
            and lm.user_id = auth.uid()
            and lm.lab_role in ('pi','lab_manager','postdoc','grad_researcher')
            and lm.is_active = true
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'applications' and policyname = 'PI and lab_manager can update application status'
  ) then
    create policy "PI and lab_manager can update application status"
      on public.applications for update
      using (
        exists (
          select 1
          from public.role_postings rp
          join public.lab_memberships lm on lm.lab_id = rp.lab_id
          where rp.id = public.applications.posting_id
            and lm.user_id = auth.uid()
            and lm.lab_role in ('pi','lab_manager')
            and lm.is_active = true
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lab_memberships_application_id_fkey'
      and conrelid = 'public.lab_memberships'::regclass
  ) then
    alter table public.lab_memberships
      add constraint lab_memberships_application_id_fkey
      foreign key (application_id)
      references public.applications(id)
      on delete set null;
  end if;
end $$;

create table if not exists public.lab_follows (
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  lab_id uuid not null references public.lab_groups(id) on delete cascade,
  followed_at timestamptz not null default now(),
  primary key (student_id, lab_id)
);

create index if not exists idx_lf_student on public.lab_follows(student_id);
create index if not exists idx_lf_lab on public.lab_follows(lab_id);

alter table public.lab_follows enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'lab_follows' and policyname = 'Students manage own follows'
  ) then
    create policy "Students manage own follows"
      on public.lab_follows for all using (auth.uid() = student_id);
  end if;
end $$;
