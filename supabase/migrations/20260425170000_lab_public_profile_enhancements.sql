alter table public.lab_groups
  add column if not exists gallery_urls text[] not null default '{}',
  add column if not exists student_fit text,
  add column if not exists expectations text;
