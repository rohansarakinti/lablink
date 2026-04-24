create or replace function public.vector_match_students_for_posting(
  p_posting_id uuid,
  p_limit int default 50
)
returns table (
  student_id uuid,
  vector_score float4
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sp.id as student_id,
    (1 - (sp.embedding <=> rp.embedding))::float4 as vector_score
  from public.student_profiles sp
  cross join (
    select embedding
    from public.role_postings
    where id = p_posting_id
  ) rp
  join public.profiles p on p.id = sp.id and p.role = 'student'
  where sp.embedding is not null
    and rp.embedding is not null
  order by sp.embedding <=> rp.embedding
  limit p_limit;
$$;

grant execute on function public.vector_match_students_for_posting(uuid, int) to authenticated;
