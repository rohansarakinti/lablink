-- Allow students to refresh their own recommendation cache (server action uses the user's JWT).

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'match_cache'
      and policyname = 'Students manage own match cache'
  ) then
    create policy "Students manage own match cache"
      on public.match_cache
      for all
      to authenticated
      using (student_id = (select auth.uid()))
      with check (student_id = (select auth.uid()));
  end if;
end $$;
