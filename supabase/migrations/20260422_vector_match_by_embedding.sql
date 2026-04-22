-- Semantic search: match open role postings to an arbitrary query embedding (same 384-dim space as gte-small).
-- float8[] is easy to pass from PostgREST/JSON clients; cast to vector in SQL.
create or replace function public.vector_match_role_postings_by_embedding(
  p_embedding double precision[],
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
    (1 - (rp.embedding <=> p_embedding::vector(384)))::float4 as vector_score
  from public.role_postings rp
  where rp.status = 'open'
    and rp.embedding is not null
  order by rp.embedding <=> p_embedding::vector(384)
  limit p_limit;
$$;

grant execute on function public.vector_match_role_postings_by_embedding(double precision[], int) to authenticated;
