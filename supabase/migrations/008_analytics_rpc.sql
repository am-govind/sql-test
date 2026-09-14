-- Organization-scoped analytics input RPC.
-- The API still owns response formatting, while Supabase performs the
-- tenant filter and optional exam filter in one database call.
create or replace function public.get_analytics_submissions(
  p_organization_id uuid,
  p_exam_id uuid default null
)
returns table (
  id uuid,
  student_id uuid,
  student_name text,
  roll_number text,
  analytics jsonb,
  violations jsonb,
  lesson_results jsonb,
  submitted_at timestamptz,
  submission_reason text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.student_id,
    s.student_name,
    s.roll_number,
    s.analytics,
    s.violations,
    s.lesson_results,
    s.submitted_at,
    s.submission_reason
  from public.submissions s
  where s.organization_id = p_organization_id
    and (p_exam_id is null or s.exam_id = p_exam_id)
  order by s.submitted_at desc;
$$;

revoke all on function public.get_analytics_submissions(uuid, uuid) from public;
grant execute on function public.get_analytics_submissions(uuid, uuid) to service_role;
