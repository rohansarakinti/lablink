-- PostgREST is more reliable with a text/JSON array than double precision[] for large vectors.
drop function if exists public.vector_match_role_postings_by_embedding(double precision[], int);

create or replace function public.vector_match_role_postings_by_embedding(
  p_embedding text,
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

grant execute on function public.vector_match_role_postings_by_embedding(text, int) to authenticated;
