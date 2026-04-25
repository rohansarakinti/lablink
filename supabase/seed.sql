-- LabLink — development seed (abundant data for non-empty pages)
-- PREREQUISITE: Apply ALL migrations in supabase/migrations/ (timestamp order) first.
--   This file does NOT create tables (e.g. public.profiles). Without migrations you get:
--   ERROR: relation "public.profiles" does not exist
-- Run: `supabase db reset` (local) or paste migrations then this file into the SQL editor (hosted).
-- All test accounts use password: SeedPass123!  (8+ chars for Supabase)
--
-- Demo personas (pre-med / translational IO): see end of file —
--   professor.smith@lablink-demo.test, anushka.bakshi@lablink-demo.test (+ synthetic applicants; not for login).
--   Resume/CV source text: docs/seed/anushka-bakshi-resume.md, docs/seed/professor-smith-cv.md
--
-- Emails: profNN@lablink-seed.test (12), studentNN@lablink-seed.test (24)
-- NOTE: If auth.users insert fails (hosted project policies), create matching users
--   in Auth → Users with the same emails, then re-run the section marked "PUBLIC DATA ONLY"
--   from line ~180 (or export UUIDs and replace the constants below).

begin;

create extension if not exists pgcrypto;
-- Use `crypt` / `gen_salt` from pgcrypto (works with `extensions.crypt` on Supabase when the extension lives in `extensions`).

-- --- Auth: professors (12) and students (24) with deterministic UUIDs
do $seed$
declare
  i int;
  uid uuid;
  em text;
  inst uuid := '00000000-0000-0000-0000-000000000000';
begin
  for i in 1..12 loop
    uid := ('10000000-0001-4000-8000-' || lpad(to_hex(i::bigint), 12, '0'))::uuid;
    em := 'prof' || lpad(i::text, 2, '0') || '@lablink-seed.test';
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, is_sso_user, is_anonymous,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      uid, inst, 'authenticated', 'authenticated', em,
      crypt('SeedPass123!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('role', 'professor'),
      now(), now(), false, false,
      '', '', '', ''
    ) on conflict (id) do nothing;

    if not exists (select 1 from auth.identities where user_id = uid) then
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (
        gen_random_uuid(), uid, uid::text,
        jsonb_build_object('sub', uid::text, 'email', em, 'email_verified', true, 'phone_verified', false),
        'email', now(), now(), now()
      );
    end if;
  end loop;

  for i in 1..24 loop
    uid := ('20000000-0002-4000-8000-' || lpad(to_hex(i::bigint), 12, '0'))::uuid;
    em := 'student' || lpad(i::text, 2, '0') || '@lablink-seed.test';
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, is_sso_user, is_anonymous,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      uid, inst, 'authenticated', 'authenticated', em,
      crypt('SeedPass123!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('role', 'student'),
      now(), now(), false, false,
      '', '', '', ''
    ) on conflict (id) do nothing;

    if not exists (select 1 from auth.identities where user_id = uid) then
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (
        gen_random_uuid(), uid, uid::text,
        jsonb_build_object('sub', uid::text, 'email', em, 'email_verified', true, 'phone_verified', false),
        'email', now(), now(), now()
      );
    end if;
  end loop;
end
$seed$;

-- GoTrue does not allow NULL in several auth.users token fields (see supabase/auth#1940). Fix any
-- pre-existing seed rows or any insert path that left them NULL, or login returns 500 "Database error querying schema".
update auth.users
set
  confirmation_token = coalesce(confirmation_token, ''),
  email_change = coalesce(email_change, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  recovery_token = coalesce(recovery_token, '')
where email like '%@lablink-seed.test';

-- Fail fast with a clear message if migrations were not applied first (RLS is unrelated to this error).
do $prereq$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles'
  ) then
    raise exception '%',
      'LabLink seed requires the database schema from supabase/migrations/. '
      || 'public.profiles is missing. In the SQL editor, run ALL migration .sql files in timestamp order '
      || '(start with migrations: first file 20260420120000_foundation_profiles.sql), then run this seed again. '
      || 'See comment block at top of seed.sql.';
  end if;
end
$prereq$;

-- --- Profiles (idempotent upsert)
insert into public.profiles (id, role, display_name, email, onboarding_complete, is_verified)
select ('10000000-0001-4000-8000-' || lpad(to_hex(i::bigint), 12, '0'))::uuid,
  'professor',
  'Seed Prof ' || i,
  'prof' || lpad(i::text, 2, '0') || '@lablink-seed.test',
  true,
  true
from generate_series(1, 12) as i
on conflict (id) do update set
  role = excluded.role,
  display_name = excluded.display_name,
  email = excluded.email,
  onboarding_complete = excluded.onboarding_complete;

insert into public.profiles (id, role, display_name, email, onboarding_complete, is_verified)
select ('20000000-0002-4000-8000-' || lpad(to_hex(i::bigint), 12, '0'))::uuid,
  'student',
  'Seed Student ' || i,
  'student' || lpad(i::text, 2, '0') || '@lablink-seed.test',
  true,
  true
from generate_series(1, 24) as i
on conflict (id) do update set
  role = excluded.role,
  display_name = excluded.display_name,
  email = excluded.email,
  onboarding_complete = excluded.onboarding_complete;

-- --- Professor profiles
insert into public.professor_profiles (
  id, full_name, title, university, department, research_fields, research_keywords, research_summary,
  preferred_majors, preferred_student_year, profile_visibility, notify_new_applications, notify_weekly_digest
)
select ('10000000-0001-4000-8000-' || lpad(to_hex(i::bigint), 12, '0'))::uuid,
  'Dr. ' || (array['Avery','Blake','Casey','Drew','Emery','Finley','Gray','Harper','Indigo','Jordan','Kai','Logan'])[i],
  (array['Assistant Professor','Associate Professor','Professor'])[1 + ((i - 1) % 3)],
  (array['Riverside University','Summit State','Harbor College','Lakeside Institute'])[1 + ((i - 1) % 4)],
  (array['Neuroscience','Computer Science','Biomedical Engineering','Chemistry','Psychology'])[1 + ((i - 1) % 5)],
  case (i - 1) % 5
    when 0 then array['neuroscience', 'ml']
    when 1 then array['robotics', 'systems']
    when 2 then array['chemistry', 'materials']
    when 3 then array['genomics', 'bioinfo']
    else array['hci', 'vis']
  end,
  case (i - 1) % 5
    when 0 then array['eeg', 'spikes']
    when 1 then array['ros', 'slam']
    when 2 then array['synthesis', 'nmr']
    when 3 then array['gwas', 'scrna']
    else array['d3', 'vega']
  end,
  'Our lab works on open problems in ' || (array['systems neuroscience','intelligent systems','chemical sensing','genomics','human-centered computing'])[1 + ((i - 1) % 5)] || ' with a collaborative culture.',
  array['CS','BME','Neuro'],
  case (i - 1) % 2 when 0 then array['junior', 'senior'] else array['senior', 'graduate'] end,
  'public',
  true,
  true
from generate_series(1, 12) as i
on conflict (id) do update set
  full_name = excluded.full_name,
  title = excluded.title,
  university = excluded.university,
  department = excluded.department,
  research_fields = excluded.research_fields,
  research_keywords = excluded.research_keywords,
  research_summary = excluded.research_summary;

-- --- Student profiles (varied for discover / matching demos)
insert into public.student_profiles (
  id, full_name, university, year, major, gpa, research_fields, research_topics, skills, programming_languages,
  time_commitment, paid_preference, experience_types, motivations, priorities, willing_to_volunteer
)
select
  ('20000000-0002-4000-8000-' || lpad(to_hex(s::bigint), 12, '0'))::uuid,
  'Student ' || s,
  (array['Riverside University','Summit State','Harbor College','Lakeside Institute','Prairie A&M'])[1 + ((s - 1) % 5)],
  (array['sophomore','junior','senior','graduate'])[1 + ((s - 1) % 4)],
  case (s - 1) % 5
    when 0 then array['CS', 'Stats']
    when 1 then array['BME', 'Math']
    when 2 then array['Neuro', 'CS']
    when 3 then array['Chem', 'Data Science']
    else array['Psych', 'Stats']
  end,
  (3.2 + (s % 7) * 0.1)::numeric(3,2),
  case (s - 1) % 5
    when 0 then array['Machine Learning', 'Neuro']
    when 1 then array['Chemistry', 'Materials']
    when 2 then array['HCI']
    when 3 then array['Genomics', 'Stats']
    else array['Robotics']
  end,
  case (s - 1) % 5
    when 0 then array['neural coding', 'bayesian', 'interpretability']
    when 1 then array['battery', 'materials', 'kinetics']
    when 2 then array['AR', 'interfaces', 'human factors']
    when 3 then array['single-cell', 'eQTLs', 'workflows']
    else array['embodied', 'agents', 'rl']
  end,
  case (s - 1) % 5
    when 0 then array['Python', 'R', 'MATLAB', 'PyTorch', 'Wet lab']
    when 1 then array['Python', 'C++', 'Cell culture']
    when 2 then array['Figma', 'D3', 'R']
    when 3 then array['R', 'Bioconductor', 'Seurat']
    else array['Python', 'ROS', 'C++']
  end,
  case (s - 1) % 5
    when 0 then array['Python', 'R', 'MATLAB']
    when 1 then array['C++', 'Python', 'Bash']
    when 2 then array['TypeScript', 'D3', 'R']
    when 3 then array['R', 'Bash', 'HPC']
    else array['Python', 'C++', 'ROS']
  end,
  (array['5-10','10-20','5-10','<5'])[1 + ((s - 1) % 4)],
  (array['either','paid','either','unpaid'])[1 + ((s - 1) % 4)],
  case (s - 1) % 5
    when 0 then array['data_analysis', 'hands_on_lab']
    when 1 then array['hands_on_lab', 'mentorship']
    when 2 then array['data_analysis']
    when 3 then array['data_analysis', 'hands_on_lab']
    else array['mentorship']
  end,
  case (s - 1) % 3
    when 0 then array['career_exploration', 'publications']
    when 1 then array['med_school_prep', 'lab_experience']
    else array['specific_topic', 'relationships']
  end,
  case (s - 1) % 3
    when 0 then array['hands_on', 'mentorship', 'flexible_schedule']
    when 1 then array['mentorship', 'prestige', 'hands_on']
    else array['flexible_schedule', 'mentorship']
  end,
  (s % 3 <> 0)
from generate_series(1, 24) as s
on conflict (id) do update set
  full_name = excluded.full_name,
  university = excluded.university,
  year = excluded.year,
  major = excluded.major,
  gpa = excluded.gpa,
  research_fields = excluded.research_fields,
  research_topics = excluded.research_topics,
  skills = excluded.skills,
  programming_languages = excluded.programming_languages,
  time_commitment = excluded.time_commitment,
  paid_preference = excluded.paid_preference,
  experience_types = excluded.experience_types,
  motivations = excluded.motivations,
  priorities = excluded.priorities,
  willing_to_volunteer = excluded.willing_to_volunteer;

-- --- Lab groups (15), memberships, postings, applications, follows, notifications
do $lab$
declare
  L int;
  P int; -- professor index 1..12
  lab_uuid uuid;
  post_uuid uuid;
  pidx int := 0;
  prof_uuid uuid;
  st int;
  st_uuid uuid;
  st_stat text;
  other_prof uuid;
  j int;
begin
  for L in 1..15 loop
    if L <= 12 then
      P := 1 + (L - 1) / 2;
    elsif L = 13 then
      P := 7;
    elsif L = 14 then
      P := 8;
    else
      P := 9;
    end if;

    prof_uuid := ('10000000-0001-4000-8000-' || lpad(to_hex(P::bigint), 12, '0'))::uuid;
    lab_uuid := ('30000000-0003-4000-8000-' || lpad(to_hex(L::bigint), 12, '0'))::uuid;

    insert into public.lab_groups (
      id, slug, name, tagline, description, university, department, research_fields, research_tags, lab_environment,
      is_active, created_by
    ) values (
      lab_uuid,
      'seed-lab-' || lpad(L::text, 2, '0'),
      'Lab ' || L || ' — ' || (array['Neural Dynamics','Robot Perception','Materials AI','Comp Neuro','Genomics','HCI Futures','Cognitive Systems'])[1 + ((L - 1) % 7)],
      'We build ' || (array['closed-loop experiments','field robots','catalysts','neural data tools','scRNA platforms','pervasive sensing','cognitive models'])[1 + ((L - 1) % 7)],
      'The group focuses on open science, reproducible pipelines, and mentoring students through publication-quality projects.',
      (array['Riverside University','Summit State','Harbor College','Lakeside Institute'])[1 + ((L - 1) % 4)],
      (array['Neuroscience','CS','BME','Chemistry','Genomics'])[1 + ((L - 1) % 5)],
      case (L - 1) % 6
        when 0 then array['neuro','ml','systems']
        when 1 then array['robotics','perception','systems']
        when 2 then array['materials','chemistry','ml']
        when 3 then array['comp-neuro','theory','coding']
        when 4 then array['genomics','stats','hpc']
        else array['hci','vis','accessibility']
      end,
      case (L - 1) % 6
        when 0 then array['eeg','spikes','dynamics']
        when 1 then array['ros2','depth','lidar']
        when 2 then array['dft','nmr','crystal']
        when 3 then array['connectivity','ode','eeg']
        when 4 then array['gwas','scRNA','eQTL']
        else array['user_studies','d3','a11y']
      end,
      case (L - 1) % 2 when 0 then array['fast_paced','collaborative'] else array['balanced','exploratory'] end,
      true,
      prof_uuid
    ) on conflict (id) do update set
      name = excluded.name,
      tagline = excluded.tagline,
      description = excluded.description,
      research_fields = excluded.research_fields,
      research_tags = excluded.research_tags,
      updated_at = now();

    -- PI membership
    insert into public.lab_memberships (lab_id, user_id, lab_role, is_active)
    values (lab_uuid, prof_uuid, 'pi', true)
    on conflict (lab_id, user_id) do nothing;

    -- Lab manager from another seed professor (round-robin)
    other_prof := ('10000000-0001-4000-8000-' || lpad(to_hex((1 + (L % 12))::bigint), 12, '0'))::uuid;
    if other_prof <> prof_uuid then
      insert into public.lab_memberships (lab_id, user_id, lab_role, is_active)
      values (lab_uuid, other_prof, 'lab_manager', true)
      on conflict (lab_id, user_id) do nothing;
    end if;

    -- A few students as members (not all; leaves room for "apply" flow)
    for j in 0..2 loop
      st := 1 + ((L * 3 + j) % 24);
      st_uuid := ('20000000-0002-4000-8000-' || lpad(to_hex(st::bigint), 12, '0'))::uuid;
      insert into public.lab_memberships (lab_id, user_id, lab_role, is_active, application_id)
      values (lab_uuid, st_uuid, (array['undergrad_ra','grad_researcher','postdoc'])[1 + (j % 3)], true, null)
      on conflict (lab_id, user_id) do nothing;
    end loop;

    -- 4 role postings / lab: mostly open, some closed/draft
    for j in 1..4 loop
      pidx := pidx + 1;
      post_uuid := ('40000000-0004-4000-8000-' || lpad(to_hex(pidx::bigint), 12, '0'))::uuid;
      insert into public.role_postings (
        id, lab_id, created_by, title, description, status, member_role, is_paid, hours_per_week, duration, start_date,
        required_skills, preferred_skills, preferred_year, preferred_majors,         min_gpa, min_experience, gpa_enforcement, priority_courses, eval_methods, custom_questions, spots_available
      ) values (
        post_uuid, lab_uuid, prof_uuid,
        (array['RA — signal processing & ML','Field robotics software RA','Synthesis + characterization RA','Cognitive task design RA','Wet + dry lab data RA'])[1 + ((L + j) % 5)],
        'Responsibilities include ' || (array['pipeline maintenance','data collection','literature review','mentoring juniors','prototyping'])[1 + ((pidx) % 5)] || ', weekly group meetings, and a semester report.',
        case
          when (L + j) % 7 = 0 then 'draft'
          when (L + j) % 11 = 0 then 'closed'
          else 'open'
        end,
        (array['undergrad_ra','grad_researcher','undergrad_ra','grad_researcher'])[j],
        (array['paid','either','unpaid','paid'])[1 + (pidx % 4)],
        (array['5-10','10-20','10-20','5-10'])[1 + (j % 4)],
        (array['Spring term','1 year+','2 semesters'])[1 + (j % 3)],
        (array['ASAP','Next quarter'])[1 + (j % 2)],
        case (L + j) % 4
          when 0 then array['python','git','shell']
          when 1 then array['ros','c++','python']
          when 2 then array['synthesis','hplc','analysis']
          else array['matlab','eeg','spss']
        end,
        case (L + j) % 4
          when 0 then array['pytorch','r','pandas']
          when 1 then array['pandas','bash','docker']
          when 2 then array['numpy','scipy','stats']
          else array['statistics','r','tidyverse']
        end,
        case j % 2 when 0 then array['senior','graduate'] else array['junior','senior'] end,
        case j % 2 when 0 then array['CS','BME','Neuro'] else array['Stats','BME'] end,
        (2.7 + 0.1 * (j % 4))::numeric(3,2),
        (array['none','intro_courses','prior_experience'])[1 + (j % 3)],
        (array['preferred','strict','holistic'])[1 + (j % 3)],
        array['Data Structures', 'Linear Algebra'],
        array['transcript', 'short interview'],
        '[]'::jsonb,
        2
      ) on conflict (id) do update set
        title = excluded.title,
        status = excluded.status,
        description = excluded.description;
    end loop;
  end loop;

  -- Applications: each student -> up to 9 open postings (set-based; avoids FOR-over-query in PL/pgsql on some hosts)
  insert into public.applications (posting_id, student_id, status, statement, custom_responses)
  select
    p.id,
    ('20000000-0002-4000-8000-' || lpad(to_hex(stu.s::bigint), 12, '0'))::uuid,
    case
      when (array['submitted', 'reviewing', 'interview', 'accepted', 'rejected'])[1 + ((stu.s * 3 + 1) % 5)] = 'rejected'
        and (stu.s * 3) % 7 <> 0
      then 'submitted'
      else (array['submitted', 'reviewing', 'interview', 'accepted', 'rejected'])[1 + ((stu.s * 3 + 1) % 5)]
    end,
    'I am very interested in this position because it aligns with my ' ||
    (array['goals in ML.', 'work in systems biology.', 'interest in open hardware.'])[1 + ((stu.s - 1) % 3)],
    '{}'::jsonb
  from generate_series(1, 24) stu (s)
  cross join lateral (
    select rpi.id
    from public.role_postings rpi
    where rpi.status = 'open'
    order by rpi.id
    offset greatest(0, (stu.s * 2) % 7)
    limit 9
  ) p
  on conflict (posting_id, student_id) do update set
    status = excluded.status;

  -- Lab follows: each student follows several labs
  for st in 1..20 loop
    st_uuid := ('20000000-0002-4000-8000-' || lpad(to_hex(st::bigint), 12, '0'))::uuid;
    for L in 1..3 loop
      lab_uuid := ('30000000-0003-4000-8000-' || lpad(to_hex((1 + ((st * 2 + L) % 15))::bigint), 12, '0'))::uuid;
      insert into public.lab_follows (student_id, lab_id) values (st_uuid, lab_uuid)
      on conflict (student_id, lab_id) do nothing;
    end loop;
  end loop;

  -- Notifications to professors
  for P in 1..12 loop
    prof_uuid := ('10000000-0001-4000-8000-' || lpad(to_hex(P::bigint), 12, '0'))::uuid;
    for j in 1..3 loop
      insert into public.notifications (user_id, type, payload, read) values
      (
        prof_uuid, 'application_submitted',
        jsonb_build_object('title', 'New application (seed)', 'body', 'A student applied to a posting in your lab group.'),
        (j = 1)
      );
    end loop;
  end loop;
end
$lab$;

-- ---------------------------------------------------------------------------
-- Demo personas: Professor Smith + Anushka Bakshi (pre-med / translational IO)
-- Log in: professor.smith@lablink-demo.test / anushka.bakshi@lablink-demo.test
-- Password (same as other seed users): SeedPass123!
-- Long-form resume/CV text: docs/seed/anushka-bakshi-resume.md and professor-smith-cv.md
-- Embeddings: null here; run your generate-embedding pipeline (or open profiles in-app)
--   so vector_match_* + LLM rerank reflect the rich text below.
-- Applicant pool for Smith's posting uses only UUIDs >= e222... so lexicographic tie-break
--   favors Anushka when embeddings are still null.
-- ---------------------------------------------------------------------------

-- Professor Smith
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  'e1111111-1111-4111-8111-111111111111'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'professor.smith@lablink-demo.test',
  crypt('SeedPass123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('role', 'professor'),
  now(), now(), false, false,
  '', '', '', ''
) on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(),
  'e1111111-1111-4111-8111-111111111111'::uuid,
  'e1111111-1111-4111-8111-111111111111'::text,
  jsonb_build_object(
    'sub', 'e1111111-1111-4111-8111-111111111111'::text,
    'email', 'professor.smith@lablink-demo.test',
    'email_verified', true,
    'phone_verified', false
  ),
  'email', now(), now(), now()
where not exists (
  select 1 from auth.identities where user_id = 'e1111111-1111-4111-8111-111111111111'::uuid
);

-- Anushka Bakshi
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  'e2222222-2222-4222-8222-222222222222'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'anushka.bakshi@lablink-demo.test',
  crypt('SeedPass123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('role', 'student'),
  now(), now(), false, false,
  '', '', '', ''
) on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(),
  'e2222222-2222-4222-8222-222222222222'::uuid,
  'e2222222-2222-4222-8222-222222222222'::text,
  jsonb_build_object(
    'sub', 'e2222222-2222-4222-8222-222222222222'::text,
    'email', 'anushka.bakshi@lablink-demo.test',
    'email_verified', true,
    'phone_verified', false
  ),
  'email', now(), now(), now()
where not exists (
  select 1 from auth.identities where user_id = 'e2222222-2222-4222-8222-222222222222'::uuid
);

-- Synthetic applicants (weak match for immuno-oncology RA) — UUIDs sort after Anushka for embedding-null tie-break

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  (
    'e9999999-9999-4999-8999-999999999901'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'seed.applicant.io1@lablink-demo.test',
    crypt('SeedPass123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('role', 'student'),
    now(), now(), false, false,
    '', '', '', ''
  ),
  (
    'e9999999-9999-4999-8999-999999999902'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'seed.applicant.io2@lablink-demo.test',
    crypt('SeedPass123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('role', 'student'),
    now(), now(), false, false,
    '', '', '', ''
  ),
  (
    'e9999999-9999-4999-8999-999999999903'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'seed.applicant.io3@lablink-demo.test',
    crypt('SeedPass123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('role', 'student'),
    now(), now(), false, false,
    '', '', '', ''
  )
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
  'email', now(), now(), now()
from auth.users u
where u.email in (
  'seed.applicant.io1@lablink-demo.test',
  'seed.applicant.io2@lablink-demo.test',
  'seed.applicant.io3@lablink-demo.test'
)
and not exists (select 1 from auth.identities i where i.user_id = u.id);

update auth.users
set
  confirmation_token = coalesce(confirmation_token, ''),
  email_change = coalesce(email_change, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  recovery_token = coalesce(recovery_token, '')
where email in (
  'professor.smith@lablink-demo.test',
  'anushka.bakshi@lablink-demo.test',
  'seed.applicant.io1@lablink-demo.test',
  'seed.applicant.io2@lablink-demo.test',
  'seed.applicant.io3@lablink-demo.test'
);

insert into public.profiles (id, role, display_name, email, onboarding_complete, is_verified)
values
  ('e1111111-1111-4111-8111-111111111111'::uuid, 'professor', 'Professor Jordan Smith', 'professor.smith@lablink-demo.test', true, true),
  ('e2222222-2222-4222-8222-222222222222'::uuid, 'student', 'Anushka Bakshi', 'anushka.bakshi@lablink-demo.test', true, true),
  ('e9999999-9999-4999-8999-999999999901'::uuid, 'student', 'Seed Applicant (CS)', 'seed.applicant.io1@lablink-demo.test', true, true),
  ('e9999999-9999-4999-8999-999999999902'::uuid, 'student', 'Seed Applicant (Robotics)', 'seed.applicant.io2@lablink-demo.test', true, true),
  ('e9999999-9999-4999-8999-999999999903'::uuid, 'student', 'Seed Applicant (Design)', 'seed.applicant.io3@lablink-demo.test', true, true)
on conflict (id) do update set
  display_name = excluded.display_name,
  email = excluded.email,
  onboarding_complete = excluded.onboarding_complete;

insert into public.professor_profiles (
  id, full_name, title, university, department, office_location,
  research_fields, research_keywords, research_summary,
  preferred_majors, preferred_student_year, mentorship_style, lab_culture,
  profile_visibility, notify_new_applications, notify_weekly_digest,
  lab_website, google_scholar_url, orcid, preferred_experience_level
) values (
  'e1111111-1111-4111-8111-111111111111'::uuid,
  'Jordan A. Smith, Ph.D.',
  'Associate Professor of Molecular Medicine & Immunology',
  'Summit State University',
  'Department of Molecular Medicine (joint: Immunology)',
  'Biomedical Research Tower 6-412',
  array[
    'translational oncology',
    'tumor immunology',
    'tumor microenvironment',
    'immune checkpoint therapy',
    'biomarkers',
    'myeloid biology',
    'physician-scientist training'
  ],
  array[
    'flow cytometry',
    'multiplex elisa',
    'mouse tumor models',
    'cd8 t cell exhaustion',
    'mdsc',
    'tumor-associated macrophages',
    'irb',
    'r',
    'python',
    'pre-med mentorship'
  ],
  'The Smith lab maps myeloid and CD8 dynamics in the tumor microenvironment to actionable immunotherapy biomarkers. '
  || 'We combine mouse models, human biospecimens, multiplex immunoassays, and reproducible R/Python pipelines. '
  || 'We strongly mentor undergraduates pursuing MD, MD/PhD, or PhD training with structured wet-lab training in cell culture, ELISA, and flow cytometry.',
  array['Molecular Biology', 'Biochemistry', 'Immunology', 'Global Health', 'Neuroscience'],
  array['junior', 'senior'],
  array['structured weekly 1:1s', 'journal club', 'figure drafting workshops', 'authorship when criteria met'],
  array['collaborative', 'rigorous', 'team science', 'patient-centered framing'],
  'public',
  true,
  true,
  'https://labs.summitstate.example/smith-immuno-oncology',
  'https://scholar.google.com/example/smith-immuno',
  '0000-0002-0000-0002',
  'prior coursework in immunology or cell biology preferred; committed pre-med researchers welcome.'
)
on conflict (id) do update set
  full_name = excluded.full_name,
  title = excluded.title,
  university = excluded.university,
  department = excluded.department,
  research_fields = excluded.research_fields,
  research_keywords = excluded.research_keywords,
  research_summary = excluded.research_summary,
  preferred_majors = excluded.preferred_majors,
  preferred_student_year = excluded.preferred_student_year;

insert into public.student_profiles (
  id, full_name, university, year, major, minor, gpa, is_gpa_visible,
  research_fields, research_topics, ranked_interests, skills, programming_languages,
  lab_equipment, software_tools, prior_experience, experience_details,
  experience_types, motivations, priorities, relevant_courses, role_types_sought,
  time_commitment, paid_preference, start_availability,
  honors_or_awards, publications, willing_to_volunteer,
  graduation_month, graduation_year, parsed_courses
) values (
  'e2222222-2222-4222-8222-222222222222'::uuid,
  'Anushka Bakshi',
  'Summit State University',
  'junior',
  array['Molecular Biology', 'Global Health'],
  array['South Asian Studies'],
  3.91,
  true,
  array[
    'translational oncology',
    'tumor immunology',
    'tumor microenvironment',
    'immunotherapy biomarkers',
    'clinical research',
    'health disparities'
  ],
  array[
    'myeloid infiltrates and cd8 exhaustion in syngeneic mouse models',
    'multicolor flow cytometry panels for checkpoint therapy studies',
    'elisa cytokine profiling ifn-gamma tnf-alpha il-6',
    'mammalian cell culture thp-1 differentiation primary splenocytes',
    'irb-trained chart review training cohort no phi retained',
    'pre-med physician-scientist pathway oncology interest'
  ],
  array[
    'tumor immunology',
    'wet lab immunoassays',
    'clinical correlation projects',
    'community health volunteering',
    'computational qc for cytometry'
  ],
  array[
    'flow cytometry',
    'elisa',
    'cell culture',
    'aseptic technique',
    'mouse handling iacuc training',
    'multiplex immunoassays',
    'biomarker validation',
    'irb human subjects citi',
    'science communication',
    'mentoring'
  ],
  array['r', 'python', 'graphpad prism', 'bash basics'],
  array['biosafety cabinet', 'flow cytometer', 'plate reader', 'fluorescence microscope', 'centrifuge', 'incubator'],
  array['quarto', 'redcap training', 'notion', 'latex'],
  array[
    'undergraduate tumor microenvironment rotation',
    'hospital volunteering navigation desk',
    'emergency department observation',
    'oncology physician shadowing',
    'crisis text line volunteer'
  ],
  'Co-authors flow gating figures for manuscript in preparation; presented poster on myeloid-rich niches and exhausted CD8 phenotypes '
  || 'at the Summit State Undergraduate Research Symposium (Apr 2025). Trained on IACUC mouse handling and weekly QC for multicolor panels.',
  array['hands_on_lab', 'patient_interaction', 'data_analysis', 'shadowing', 'mentorship'],
  array['med_school_prep', 'lab_experience', 'specific_topic', 'relationships', 'career_exploration'],
  array['hands_on', 'mentorship', 'patient_exposure'],
  array[
    'immunology',
    'cancer biology',
    'biochemistry i',
    'biochemistry ii',
    'cell biology',
    'genetics',
    'epidemiology biostatistics',
    'clinical research methods',
    'medical ethics',
    'organic chemistry'
  ],
  array['undergrad_ra', 'summer_full_time'],
  '10-20',
  'either',
  'immediately',
  'deans list six semesters; regents scholar; summit state undergraduate research grant 2500 usd; goldwater honorable mention',
  'poster summit state undergraduate research symposium april 2025 myeloid-rich niches exhausted cd8',
  true,
  5::smallint,
  2027::smallint,
  'immunology a, cancer biology a-, physiology a, cell biology a, genetics a, biochemistry i-ii a range'
)
on conflict (id) do update set
  full_name = excluded.full_name,
  university = excluded.university,
  year = excluded.year,
  major = excluded.major,
  minor = excluded.minor,
  gpa = excluded.gpa,
  research_fields = excluded.research_fields,
  research_topics = excluded.research_topics,
  ranked_interests = excluded.ranked_interests,
  skills = excluded.skills,
  programming_languages = excluded.programming_languages,
  lab_equipment = excluded.lab_equipment,
  software_tools = excluded.software_tools,
  prior_experience = excluded.prior_experience,
  experience_details = excluded.experience_details,
  experience_types = excluded.experience_types,
  motivations = excluded.motivations,
  priorities = excluded.priorities,
  relevant_courses = excluded.relevant_courses,
  role_types_sought = excluded.role_types_sought,
  time_commitment = excluded.time_commitment,
  paid_preference = excluded.paid_preference,
  start_availability = excluded.start_availability,
  honors_or_awards = excluded.honors_or_awards,
  publications = excluded.publications;

insert into public.student_profiles (
  id, full_name, university, year, major, gpa,
  research_fields, research_topics, skills, programming_languages,
  prior_experience, time_commitment, paid_preference, experience_types, motivations, willing_to_volunteer
) values
  (
    'e9999999-9999-4999-8999-999999999901'::uuid,
    'Alex Chen',
    'Summit State University',
    'sophomore',
    array['Computer Science'],
    3.45,
    array['machine learning', 'robotics'],
    array['slam', 'embedded systems'],
    array['java', 'c++', 'cad'],
    array['c++', 'python'],
    array['FIRST robotics', 'personal projects'],
    '10-20',
    'paid',
    array['data_analysis'],
    array['career_exploration'],
    true
  ),
  (
    'e9999999-9999-4999-8999-999999999902'::uuid,
    'Riley Nguyen',
    'Harbor College',
    'junior',
    array['Mechanical Engineering'],
    3.20,
    array['controls', 'materials'],
    array['composites', 'cfd intro'],
    array['solidworks', 'matlab', 'machining'],
    array['matlab'],
    array['formula student'],
    '5-10',
    'either',
    array['hands_on_lab'],
    array['specific_topic'],
    true
  ),
  (
    'e9999999-9999-4999-8999-999999999903'::uuid,
    'Sam Patel',
    'Lakeside Institute',
    'senior',
    array['Graphic Design'],
    3.10,
    array['visual design'],
    array['branding'],
    array['figma', 'illustrator', 'photography'],
    array['typescript'],
    array['freelance design'],
    '<5',
    'unpaid',
    array['mentorship'],
    array['relationships'],
    true
  )
on conflict (id) do update set
  full_name = excluded.full_name,
  skills = excluded.skills,
  research_fields = excluded.research_fields;

insert into public.lab_groups (
  id, slug, name, tagline, description, university, department,
  website_url, research_fields, research_tags, lab_environment,
  is_active, created_by
) values (
  'e3333333-3333-4333-8333-333333333333'::uuid,
  'smith-translational-io-summit',
  'Smith Lab — Translational Immuno-Oncology',
  'From tumor microenvironment maps to immunotherapy biomarkers — mentoring physician-scientists of tomorrow.',
  'We study myeloid and CD8 co-evolution in solid tumors using mouse models, human biospecimens, flow cytometry, multiplex ELISA, and reproducible R/Python pipelines. '
  || 'Undergraduates lead figures for posters and manuscripts, train in IACUC/IRB literacy, and work directly on translational oncology questions aligned with pre-med competencies.',
  'Summit State University',
  'Molecular Medicine & Immunology',
  'https://labs.summitstate.example/smith-immuno-oncology',
  array[
    'translational oncology',
    'tumor immunology',
    'tumor microenvironment',
    'immunotherapy',
    'biomarkers',
    'flow cytometry',
    'pre-med research training'
  ],
  array[
    'checkpoint blockade',
    'myeloid cells',
    'cd8 exhaustion',
    'cytokine profiling',
    'mouse engraftment',
    'multiplex elisa',
    'r stats',
    'python pandas',
    'irb',
    'iacuc'
  ],
  array['collaborative', 'mentorship_heavy', 'team_science', 'publication_oriented'],
  true,
  'e1111111-1111-4111-8111-111111111111'::uuid
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  research_fields = excluded.research_fields,
  research_tags = excluded.research_tags;

insert into public.lab_memberships (lab_id, user_id, lab_role, is_active)
values
  ('e3333333-3333-4333-8333-333333333333'::uuid, 'e1111111-1111-4111-8111-111111111111'::uuid, 'pi', true)
on conflict (lab_id, user_id) do nothing;

-- Optional co-manager from seed prof01 for livelier member list
insert into public.lab_memberships (lab_id, user_id, lab_role, is_active)
values
  ('e3333333-3333-4333-8333-333333333333'::uuid, '10000000-0001-4000-8000-000000000001'::uuid, 'lab_manager', true)
on conflict (lab_id, user_id) do nothing;

-- Role postings: primary RA is worded to align with embedding text fields used in generate-embedding
insert into public.role_postings (
  id, lab_id, created_by, title, description, status,
  application_deadline, member_role, is_paid, hours_per_week, duration, start_date, spots_available,
  required_skills, preferred_skills, preferred_year, preferred_majors,
  min_experience, min_gpa, gpa_enforcement, priority_courses, eval_methods, custom_questions
) values
(
  'e4444444-4444-4444-8444-444444444441'::uuid,
  'e3333333-3333-4333-8333-333333333333'::uuid,
  'e1111111-1111-4111-8111-111111111111'::uuid,
  'Undergraduate RA — Tumor microenvironment, flow cytometry & translational immuno-oncology',
  'Title: Undergraduate RA — Tumor microenvironment, flow cytometry & translational immuno-oncology. '
  || 'We seek a junior or senior who can contribute to myeloid and CD8 co-evolution projects in the tumor microenvironment, '
  || 'including multicolor flow cytometry panels, ELISA cytokine profiling (IFN-gamma, TNF-alpha, IL-6), and mammalian cell culture. '
  || 'Experience with mouse models under IACUC training is a plus. You will curate QC plots in R (tidyverse, ggplot2) and Python (pandas) '
  || 'for exploratory analysis of immunotherapy biomarkers. Ideal for pre-med students pursuing physician-scientist training who want '
  || 'hands-on wet lab work plus structured mentorship toward posters and manuscripts.',
  'open',
  '2026-06-15'::date,
  'undergrad_ra',
  'either',
  '10-20',
  '2 semesters + optional summer',
  'rolling',
  2::smallint,
  array['flow cytometry', 'elisa', 'cell culture'],
  array['r', 'python', 'immunology', 'biomarker validation', 'mouse handling iacuc training', 'science communication'],
  array['junior', 'senior'],
  array['Molecular Biology', 'Biochemistry', 'Immunology', 'Global Health'],
  'prior_experience',
  3.50,
  'holistic',
  array['immunology', 'cell biology', 'biochemistry'],
  array['transcript', 'short interview', 'reference letter'],
  '[
    {"id":"q1","prompt":"Describe a time you troubleshooted an experiment or quality-control issue.","type":"short_text"},
    {"id":"q2","prompt":"How does this role connect to your longer-term clinical or research goals?","type":"short_text"}
  ]'::jsonb
),
(
  'e4444444-4444-4444-8444-444444444442'::uuid,
  'e3333333-3333-4333-8333-333333333333'::uuid,
  'e1111111-1111-4111-8111-111111111111'::uuid,
  'Volunteer — Clinical correlation literature & biomarker database curation',
  'Support IRB-approved systematic literature updates on immunotherapy biomarkers (PD-L1, TMB, MSI limitations). '
  || 'Comfort with PubMed, citation management, and spreadsheet or R/Python wrangling preferred. Good fit for pre-med students building clinical research literacy.',
  'open',
  '2026-05-01'::date,
  'volunteer',
  'unpaid',
  '5-10',
  '1 semester renewable',
  'next quarter',
  3::smallint,
  array['science communication', 'r'],
  array['python', 'irb human subjects citi'],
  array['sophomore', 'junior', 'senior'],
  array['Global Health', 'Molecular Biology'],
  'intro_courses',
  3.30,
  'preferred',
  array['epidemiology biostatistics', 'clinical research methods'],
  array['work sample'],
  '[]'::jsonb
),
(
  'e4444444-4444-4444-8444-444444444443'::uuid,
  'e3333333-3333-4333-8333-333333333333'::uuid,
  'e1111111-1111-4111-8111-111111111111'::uuid,
  'Postdoc — Spatial myeloid programs (draft)',
  'Placeholder draft for future hire; not visible to students when closed.',
  'draft',
  null,
  'postdoc',
  'paid',
  '20+',
  '2 years',
  'fall 2026',
  1::smallint,
  array['spatial biology', 'single-cell'],
  array['python', 'r'],
  array['graduate'],
  array['Molecular Biology'],
  'prior_experience',
  3.70,
  'strict',
  array['advanced immunology'],
  array['cv', 'talk'],
  '[]'::jsonb
)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  status = excluded.status;

insert into public.lab_posts (id, lab_id, author_id, caption, tags, is_published)
values
(
  'e5555555-5555-4555-8555-555555555501'::uuid,
  'e3333333-3333-4333-8333-333333333333'::uuid,
  'e1111111-1111-4111-8111-111111111111'::uuid,
  'Journal club this week: biomarker discordance after PD-1 therapy — residents and undergrads welcome. '
  || 'We will connect mechanistic mouse data to clinical case discussions (de-identified).',
  array['journal club', 'immunotherapy biomarkers', 'pre-med', 'tumor microenvironment', 'cd8 t cells'],
  true
),
(
  'e5555555-5555-4555-8555-555555555502'::uuid,
  'e3333333-3333-4333-8333-333333333333'::uuid,
  'e1111111-1111-4111-8111-111111111111'::uuid,
  'New cohort incoming: we are prioritizing undergrads with flow + ELISA experience for the translational immuno-oncology RA role. '
  || 'See open posting — we especially value mentorship fit and clear communication for physician-scientist tracks.',
  array['hiring', 'flow cytometry', 'elisa', 'undergraduate research', 'translational oncology'],
  true
),
(
  'e5555555-5555-4555-8555-555555555503'::uuid,
  'e3333333-3333-4333-8333-333333333333'::uuid,
  'e1111111-1111-4111-8111-111111111111'::uuid,
  'Lab wins internal pilot award for multiplex cytokine profiling core — shout-out to students who standardized QC plots in R/Python.',
  array['grants', 'multiplex elisa', 'r', 'python', 'team science'],
  true
),
(
  'e5555555-5555-4555-8555-555555555504'::uuid,
  'e3333333-3333-4333-8333-333333333333'::uuid,
  'e1111111-1111-4111-8111-111111111111'::uuid,
  'Reminder: all mouse work requires updated IACUC badges + buddy system for tumor measurements.',
  array['iacuc', 'mouse models', 'training'],
  true
)
on conflict (id) do update set
  caption = excluded.caption,
  tags = excluded.tags;

insert into public.lab_follows (student_id, lab_id)
values ('e2222222-2222-4222-8222-222222222222'::uuid, 'e3333333-3333-4333-8333-333333333333'::uuid)
on conflict (student_id, lab_id) do nothing;

-- Applications: Smith primary posting (pool crafted for ranking demos)
insert into public.applications (posting_id, student_id, status, statement, custom_responses)
values
(
  'e4444444-4444-4444-8444-444444444441'::uuid,
  'e2222222-2222-4222-8222-222222222222'::uuid,
  'reviewing',
  'I am applying because your posting mirrors my rotation in tumor microenvironment immunity: multicolor flow for CD3/CD4/CD8/PD-1, '
  || 'ELISA for IFN-gamma/TNF-alpha/IL-6, and THP-1 / splenocyte processing. I want to deepen biomarker validation skills and contribute to manuscripts '
  || 'while preparing for MD applications with a physician-scientist focus.',
  '{"q1":"During flow QC I noticed CD8 counts drifting across batches; I re-titered antibodies and logged instrument settings in a Quarto notebook until MFI stabilized.","q2":"I hope to pair wet-lab immuno-oncology training with longitudinal exposure to how biomarkers inform clinical trial design."}'::jsonb
),
(
  'e4444444-4444-4444-8444-444444444441'::uuid,
  'e9999999-9999-4999-8999-999999999901'::uuid,
  'submitted',
  'I code well and learn fast; interested in bioinformatics side of your projects.',
  '{}'::jsonb
),
(
  'e4444444-4444-4444-8444-444444444441'::uuid,
  'e9999999-9999-4999-8999-999999999902'::uuid,
  'submitted',
  'Mechanical engineer looking to pivot; willing to build hardware for lab automation.',
  '{}'::jsonb
),
(
  'e4444444-4444-4444-8444-444444444441'::uuid,
  'e9999999-9999-4999-8999-999999999903'::uuid,
  'submitted',
  'Can help with figures and outreach materials for the lab.',
  '{}'::jsonb
)
on conflict (posting_id, student_id) do update set
  statement = excluded.statement,
  status = excluded.status,
  custom_responses = excluded.custom_responses;

-- Anushka: additional applications for a lively Track tab (open postings from main seed batch)
insert into public.applications (posting_id, student_id, status, statement, custom_responses)
select p.id, 'e2222222-2222-4222-8222-222222222222'::uuid,
  case (row_number() over (order by p.id)) % 4
    when 0 then 'submitted'
    when 1 then 'reviewing'
    when 2 then 'interview'
    else 'submitted'
  end,
  'I am broadly interested in translational work connecting wet lab immuno skills to patient-relevant outcomes; this posting complements my primary immuno-oncology focus.',
  '{}'::jsonb
from public.role_postings p
where p.status = 'open'
  and p.id <> 'e4444444-4444-4444-8444-444444444441'::uuid
order by p.created_at desc
limit 7
on conflict (posting_id, student_id) do nothing;

-- Notifications
insert into public.notifications (user_id, type, payload, read)
values
(
  'e2222222-2222-4222-8222-222222222222'::uuid,
  'new_match',
  jsonb_build_object(
    'title', 'Strong match: Smith Lab',
    'body', 'Your profile aligns with translational immuno-oncology roles — review the open RA posting.'
  ),
  false
),
(
  'e2222222-2222-4222-8222-222222222222'::uuid,
  'application_status_change',
  jsonb_build_object(
    'title', 'Application in review',
    'body', 'Smith Lab moved your RA application to reviewing.',
    'new_status', 'reviewing',
    'posting_title', 'Undergraduate RA — Tumor microenvironment, flow cytometry & translational immuno-oncology'
  ),
  false
),
(
  'e2222222-2222-4222-8222-222222222222'::uuid,
  'new_lab_post',
  jsonb_build_object(
    'title', 'Smith Lab update',
    'body', 'New feed post: hiring note for flow + ELISA experience.',
    'caption_preview', 'New cohort incoming: we are prioritizing undergrads with flow + ELISA experience...'
  ),
  true
),
(
  'e1111111-1111-4111-8111-111111111111'::uuid,
  'application_submitted',
  jsonb_build_object(
    'title', 'New applications',
    'body', 'Students applied to your translational immuno-oncology RA posting.'
  ),
  false
),
(
  'e1111111-1111-4111-8111-111111111111'::uuid,
  'posting_published',
  jsonb_build_object(
    'title', 'Posting live',
    'body', 'Your undergraduate RA role is open to applicants.',
    'posting_id', 'e4444444-4444-4444-8444-444444444441'
  ),
  true
);

-- Warm match_cache for Anushka (Explore); recomputed on dashboard if stale
with picked as (
  select p.id, p.created_at
  from public.role_postings p
  where p.status = 'open'
  order by
    case when p.id = 'e4444444-4444-4444-8444-444444444441'::uuid then 0 else 1 end,
    p.created_at desc
  limit 14
),
ranked as (
  select
    id as posting_id,
    row_number() over (
      order by
        case when id = 'e4444444-4444-4444-8444-444444444441'::uuid then 0 else 1 end,
        created_at desc
    ) as llm_rank
  from picked
)
insert into public.match_cache (student_id, posting_id, vector_score, llm_rank, llm_reason, computed_at)
select
  'e2222222-2222-4222-8222-222222222222'::uuid,
  r.posting_id,
  greatest(
    0.55::float4,
    (0.92::float4 - (r.llm_rank::float4 - 1.0::float4) * 0.02::float4)
  ) as vector_score,
  r.llm_rank::int,
  case
    when r.posting_id = 'e4444444-4444-4444-8444-444444444441'::uuid
    then 'Top match: shared tumor microenvironment, flow cytometry, ELISA, and R/Python stack with explicit pre-med mentorship.'
    else 'Open role in your research interest graph (seed cache; refresh for live LLM).'
  end,
  now()
from ranked r
on conflict (student_id, posting_id) do update set
  vector_score = excluded.vector_score,
  llm_rank = excluded.llm_rank,
  llm_reason = excluded.llm_reason,
  computed_at = excluded.computed_at;

commit;
