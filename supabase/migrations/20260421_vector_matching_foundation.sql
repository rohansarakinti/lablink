create extension if not exists vector;

alter table public.student_profiles
  add column if not exists embedding vector(384);

alter table public.role_postings
  add column if not exists embedding vector(384);

create index if not exists idx_sp_embedding
  on public.student_profiles using hnsw (embedding vector_cosine_ops);

create index if not exists idx_rp_embedding
  on public.role_postings using hnsw (embedding vector_cosine_ops);

create table if not exists public.match_cache (
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  posting_id uuid not null references public.role_postings(id) on delete cascade,
  vector_score float4 not null default 0,
  llm_rank int,
  llm_reason text,
  computed_at timestamptz not null default now(),
  primary key (student_id, posting_id)
);

create index if not exists idx_match_cache_student_rank
  on public.match_cache(student_id, llm_rank, vector_score desc);

alter table public.match_cache enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'match_cache'
      and policyname = 'Students view own match cache'
  ) then
    create policy "Students view own match cache"
      on public.match_cache
      for select
      using (student_id = auth.uid());
  end if;
end $$;

create or replace function public.vector_match_role_postings(
  p_student_id uuid,
  p_limit int default 50
)
returns table (
  posting_id uuid,
  vector_score float4
)
language sql
stable
security definer
set search_path = public
as $$
  select
    rp.id as posting_id,
    (1 - (rp.embedding <=> sp.embedding))::float4 as vector_score
  from public.role_postings rp
  cross join (
    select embedding
    from public.student_profiles
    where id = p_student_id
  ) sp
  where rp.status = 'open'
    and rp.embedding is not null
    and sp.embedding is not null
  order by rp.embedding <=> sp.embedding
  limit p_limit;
$$;

grant execute on function public.vector_match_role_postings(uuid, int) to authenticated;
