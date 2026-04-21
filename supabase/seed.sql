-- LabLink — development seed (abundant data for non-empty pages)
-- Run: `supabase db reset` (local) or paste into the Supabase SQL editor (dashboard).
-- All test accounts use password: SeedPass123!  (8+ chars for Supabase)
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

commit;
