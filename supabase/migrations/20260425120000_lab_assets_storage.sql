-- Public bucket for lab logos/banners, profile avatars, resumes/CVs, application attachments.
-- Path patterns used by Server Actions (see app/*/actions.ts):
--   avatars/{userId}/{uuid}.ext
--   student-profiles/{userId}/{uuid}.ext
--   professor-profiles/{userId}/{uuid}.ext
--   applications/{userId}/{uuid}.ext
--   {userId}/{uuid}.ext   (lab logo/banner on lab create)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lab-assets',
  'lab-assets',
  true,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public read lab-assets'
  ) then
    create policy "Public read lab-assets"
      on storage.objects for select
      using (bucket_id = 'lab-assets');
  end if;
end $$;

-- Authenticated users may upload only under their own user id (see path patterns above).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users upload own lab-assets paths'
  ) then
    create policy "Users upload own lab-assets paths"
      on storage.objects for insert
      to authenticated
      with check (
        bucket_id = 'lab-assets'
        and (
          (
            split_part(name, '/', 1) = 'avatars'
            and split_part(name, '/', 2) = (select auth.uid())::text
            and split_part(name, '/', 3) <> ''
          )
          or (
            split_part(name, '/', 1) = 'student-profiles'
            and split_part(name, '/', 2) = (select auth.uid())::text
            and split_part(name, '/', 3) <> ''
          )
          or (
            split_part(name, '/', 1) = 'professor-profiles'
            and split_part(name, '/', 2) = (select auth.uid())::text
            and split_part(name, '/', 3) <> ''
          )
          or (
            split_part(name, '/', 1) = 'applications'
            and split_part(name, '/', 2) = (select auth.uid())::text
            and split_part(name, '/', 3) <> ''
          )
          or (
            split_part(name, '/', 1) = (select auth.uid())::text
            and split_part(name, '/', 2) <> ''
            and split_part(name, '/', 3) = ''
          )
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users update own lab-assets paths'
  ) then
    create policy "Users update own lab-assets paths"
      on storage.objects for update
      to authenticated
      using (
        bucket_id = 'lab-assets'
        and (
          (
            split_part(name, '/', 1) = 'avatars'
            and split_part(name, '/', 2) = (select auth.uid())::text
          )
          or (
            split_part(name, '/', 1) = 'student-profiles'
            and split_part(name, '/', 2) = (select auth.uid())::text
          )
          or (
            split_part(name, '/', 1) = 'professor-profiles'
            and split_part(name, '/', 2) = (select auth.uid())::text
          )
          or (
            split_part(name, '/', 1) = 'applications'
            and split_part(name, '/', 2) = (select auth.uid())::text
          )
          or split_part(name, '/', 1) = (select auth.uid())::text
        )
      )
      with check (
        bucket_id = 'lab-assets'
        and (
          (
            split_part(name, '/', 1) = 'avatars'
            and split_part(name, '/', 2) = (select auth.uid())::text
          )
          or (
            split_part(name, '/', 1) = 'student-profiles'
            and split_part(name, '/', 2) = (select auth.uid())::text
          )
          or (
            split_part(name, '/', 1) = 'professor-profiles'
            and split_part(name, '/', 2) = (select auth.uid())::text
          )
          or (
            split_part(name, '/', 1) = 'applications'
            and split_part(name, '/', 2) = (select auth.uid())::text
          )
          or split_part(name, '/', 1) = (select auth.uid())::text
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users delete own lab-assets paths'
  ) then
    create policy "Users delete own lab-assets paths"
      on storage.objects for delete
      to authenticated
      using (
        bucket_id = 'lab-assets'
        and (
          (
            split_part(name, '/', 1) = 'avatars'
            and split_part(name, '/', 2) = (select auth.uid())::text
          )
          or (
            split_part(name, '/', 1) = 'student-profiles'
            and split_part(name, '/', 2) = (select auth.uid())::text
          )
          or (
            split_part(name, '/', 1) = 'professor-profiles'
            and split_part(name, '/', 2) = (select auth.uid())::text
          )
          or (
            split_part(name, '/', 1) = 'applications'
            and split_part(name, '/', 2) = (select auth.uid())::text
          )
          or split_part(name, '/', 1) = (select auth.uid())::text
        )
      );
  end if;
end $$;
