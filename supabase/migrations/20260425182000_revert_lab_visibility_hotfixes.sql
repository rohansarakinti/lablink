do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'lab_groups'
      and policyname = 'Lab members can view their labs'
  ) then
    drop policy "Lab members can view their labs" on public.lab_groups;
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'role_postings'
      and policyname = 'Posting creators can view their postings'
  ) then
    drop policy "Posting creators can view their postings" on public.role_postings;
  end if;
end $$;
