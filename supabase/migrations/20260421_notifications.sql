create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in (
    'new_match',
    'application_submitted',
    'application_status_change',
    'added_to_lab',
    'posting_published',
    'new_lab_post',
    'deadline_reminder'
  )),
  payload jsonb not null default '{}',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notif_unread
  on public.notifications(user_id, created_at desc)
  where read = false;

alter table public.notifications enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'Users manage own notifications'
  ) then
    create policy "Users manage own notifications"
      on public.notifications
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;
