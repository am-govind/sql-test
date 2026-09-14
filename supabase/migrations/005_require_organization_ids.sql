-- Finalize tenant ownership after the 004 backfill.
-- This migration intentionally fails with a useful message if cleanup is incomplete.
do $$
begin
  if exists (select 1 from exams where organization_id is null)
    or exists (select 1 from students where organization_id is null)
    or exists (select 1 from exam_enrollments where organization_id is null)
    or exists (select 1 from submissions where organization_id is null) then
    raise exception 'Cannot enforce organization_id: unassigned tenant rows remain';
  end if;
end $$;

alter table exams alter column organization_id set not null;
alter table students alter column organization_id set not null;
alter table exam_enrollments alter column organization_id set not null;
alter table submissions alter column organization_id set not null;
