-- Prevent cross-organization relationships at the database level.
do $$
begin
  if exists (
    select 1
    from exam_enrollments ee
    join exams e on e.id = ee.exam_id
    where ee.organization_id <> e.organization_id
  ) then
    raise exception 'Tenant mismatch: exam_enrollments and exams';
  end if;

  if exists (
    select 1
    from exam_enrollments ee
    join students s on s.id = ee.student_id
    where ee.organization_id <> s.organization_id
  ) then
    raise exception 'Tenant mismatch: exam_enrollments and students';
  end if;

  if exists (
    select 1
    from submissions s
    join exams e on e.id = s.exam_id
    where s.organization_id <> e.organization_id
  ) then
    raise exception 'Tenant mismatch: submissions and exams';
  end if;

  if exists (
    select 1
    from submissions s
    join students st on st.id = s.student_id
    where s.organization_id <> st.organization_id
  ) then
    raise exception 'Tenant mismatch: submissions and students';
  end if;
end $$;

create unique index if not exists exams_id_organization_unique
  on exams(id, organization_id);
create unique index if not exists students_id_organization_unique
  on students(id, organization_id);

alter table exam_enrollments
  drop constraint if exists exam_enrollments_exam_org_fkey,
  add constraint exam_enrollments_exam_org_fkey
    foreign key (exam_id, organization_id)
    references exams(id, organization_id);

alter table exam_enrollments
  drop constraint if exists exam_enrollments_student_org_fkey,
  add constraint exam_enrollments_student_org_fkey
    foreign key (student_id, organization_id)
    references students(id, organization_id);

alter table submissions
  drop constraint if exists submissions_exam_org_fkey,
  add constraint submissions_exam_org_fkey
    foreign key (exam_id, organization_id)
    references exams(id, organization_id);

alter table submissions
  drop constraint if exists submissions_student_org_fkey,
  add constraint submissions_student_org_fkey
    foreign key (student_id, organization_id)
    references students(id, organization_id);
