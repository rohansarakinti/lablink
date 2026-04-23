-- Lab social feed posts (LinkedIn-style updates) + post-media storage bucket.

create table if not exists public.lab_posts (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references public.lab_groups(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,

  caption text not null,
  media jsonb not null default '[]',
  tags text[] not null default '{}',

  is_published boolean not null default true,

  -- Maintained by trigger (not GENERATED): PG requires immutable expressions for
  -- generated columns; to_tsvector/array_to_string are not immutable.
  fts tsvector not null default ''::tsvector,

  embedding vector(384),
  post_views integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.lab_posts_set_fts()
returns trigger
language plpgsql
as $$
begin
  new.fts := to_tsvector(
    'english',
    coalesce(new.caption, '') || ' ' || coalesce(array_to_string(new.tags, ' '), '')
  );
  return new;
end;
$$;

drop trigger if exists lab_posts_set_fts_trigger on public.lab_posts;
create trigger lab_posts_set_fts_trigger
before insert or update of caption, tags on public.lab_posts
for each row execute function public.lab_posts_set_fts();

drop trigger if exists lab_posts_updated_at on public.lab_posts;
create trigger lab_posts_updated_at
before update on public.lab_posts
for each row execute function public.set_updated_at();

create index if not exists idx_lab_posts_lab_id on public.lab_posts(lab_id);
create index if not exists idx_lab_posts_created on public.lab_posts(created_at desc);
create index if not exists idx_lab_posts_tags on public.lab_posts using gin(tags);
create index if not exists idx_lab_posts_fts on public.lab_posts using gin(fts);
create index if not exists idx_lab_posts_embedding
  on public.lab_posts using hnsw (embedding vector_cosine_ops);

alter table public.lab_posts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lab_posts' and policyname = 'Anyone can view published lab posts'
  ) then
    create policy "Anyone can view published lab posts"
      on public.lab_posts for select
      using (is_published = true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lab_posts' and policyname = 'Lab members view unpublished lab posts'
  ) then
    create policy "Lab members view unpublished lab posts"
      on public.lab_posts for select
      using (
        is_published = false
        and exists (
          select 1 from public.lab_memberships lm
          where lm.lab_id = public.lab_posts.lab_id
            and lm.user_id = auth.uid()
            and lm.is_active = true
        )
        and (
          author_id = auth.uid()
          or exists (
            select 1 from public.lab_memberships lm
            where lm.lab_id = public.lab_posts.lab_id
              and lm.user_id = auth.uid()
              and lm.lab_role in ('pi', 'lab_manager')
              and lm.is_active = true
          )
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lab_posts' and policyname = 'Lab feed posters can insert'
  ) then
    create policy "Lab feed posters can insert"
      on public.lab_posts for insert
      with check (
        author_id = auth.uid()
        and exists (
          select 1 from public.lab_memberships lm
          where lm.lab_id = public.lab_posts.lab_id
            and lm.user_id = auth.uid()
            and lm.lab_role in ('pi', 'lab_manager', 'postdoc', 'grad_researcher')
            and lm.is_active = true
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lab_posts' and policyname = 'Lab post author or PI manager can update'
  ) then
    create policy "Lab post author or PI manager can update"
      on public.lab_posts for update
      using (
        author_id = auth.uid()
        or exists (
          select 1 from public.lab_memberships lm
          where lm.lab_id = public.lab_posts.lab_id
            and lm.user_id = auth.uid()
            and lm.lab_role in ('pi', 'lab_manager')
            and lm.is_active = true
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lab_posts' and policyname = 'Lab post author or PI manager can delete'
  ) then
    create policy "Lab post author or PI manager can delete"
      on public.lab_posts for delete
      using (
        author_id = auth.uid()
        or exists (
          select 1 from public.lab_memberships lm
          where lm.lab_id = public.lab_posts.lab_id
            and lm.user_id = auth.uid()
            and lm.lab_role in ('pi', 'lab_manager')
            and lm.is_active = true
        )
      );
  end if;
end $$;

-- Storage: public images for feed posts
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media',
  'post-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public read post-media'
  ) then
    create policy "Public read post-media"
      on storage.objects for select
      using (bucket_id = 'post-media');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Lab feed posters upload post-media'
  ) then
    create policy "Lab feed posters upload post-media"
      on storage.objects for insert
      with check (
        bucket_id = 'post-media'
        and auth.role() = 'authenticated'
        and split_part(name, '/', 2) = auth.uid()::text
        and split_part(name, '/', 3) <> ''
        and exists (
          select 1 from public.lab_memberships lm
          where lm.user_id = auth.uid()
            and lm.is_active = true
            and lm.lab_role in ('pi', 'lab_manager', 'postdoc', 'grad_researcher')
            and lm.lab_id::text = split_part(name, '/', 1)
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Lab feed posters delete own lab post-media'
  ) then
    create policy "Lab feed posters delete own lab post-media"
      on storage.objects for delete
      using (
        bucket_id = 'post-media'
        and auth.role() = 'authenticated'
        and (
          split_part(name, '/', 2) = auth.uid()::text
          or exists (
            select 1 from public.lab_memberships lm
            where lm.user_id = auth.uid()
              and lm.is_active = true
              and lm.lab_role in ('pi', 'lab_manager')
              and lm.lab_id::text = split_part(name, '/', 1)
          )
        )
      );
  end if;
end $$;
