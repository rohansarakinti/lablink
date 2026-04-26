do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users insert own profile'
  ) then
    create policy "Users insert own profile"
      on public.profiles
      for insert
      with check (auth.uid() = id);
  end if;
end $$;
