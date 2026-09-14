-- Multitenancy foundation. Run after 003_exam_ownership.sql.
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('owner', 'admin', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

alter table exams add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table students add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table exam_enrollments add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table submissions add column if not exists organization_id uuid references organizations(id) on delete cascade;

-- One legacy organization per existing admin. This is intentionally deterministic.
insert into organizations (name)
select 'Organization - ' || coalesce(u.email, u.id::text)
from auth.users u
where exists (select 1 from exams e where e.created_by = u.id)
  and not exists (select 1 from organizations o where o.name = 'Organization - ' || coalesce(u.email, u.id::text));

insert into organization_members (organization_id, user_id, role)
select o.id, u.id, 'owner'
from auth.users u
join organizations o on o.name = 'Organization - ' || coalesce(u.email, u.id::text)
where not exists (
  select 1 from organization_members m
  where m.organization_id = o.id and m.user_id = u.id
);

update exams e
set organization_id = o.id
from organizations o
where e.organization_id is null
  and o.name = 'Organization - ' || coalesce((select u.email from auth.users u where u.id = e.created_by), e.created_by::text);

update exam_enrollments ee
set organization_id = e.organization_id
from exams e
where ee.organization_id is null and ee.exam_id = e.id;

update submissions s
set organization_id = e.organization_id
from exams e
where s.organization_id is null and s.exam_id = e.id;

-- Students enrolled in multiple organizations are not guessed at. They remain
-- NULL and can be reviewed or duplicated per organization before constrainting.
update students s
set organization_id = x.organization_id
from (
  select ee.student_id, (array_agg(ee.organization_id order by ee.organization_id))[1] as organization_id
  from exam_enrollments ee
  group by ee.student_id
  having count(distinct ee.organization_id) = 1
) x
where s.id = x.student_id and s.organization_id is null;

create index if not exists exams_organization_id_idx on exams(organization_id);
create index if not exists students_organization_id_idx on students(organization_id);
create index if not exists enrollments_organization_id_idx on exam_enrollments(organization_id);
create index if not exists submissions_organization_id_idx on submissions(organization_id);

create or replace function public.is_org_member(org_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from organization_members m where m.organization_id = org_id and m.user_id = auth.uid());
$$;

alter table organizations enable row level security;
alter table organization_members enable row level security;

create policy organizations_member_read on organizations for select to authenticated
  using (is_org_member(id));
create policy members_same_org on organization_members for select to authenticated
  using (is_org_member(organization_id));

drop policy if exists exams_admin_own on exams;
create policy exams_member_all on exams for all to authenticated
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy students_member_all on students for all to authenticated
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy enrollments_member_all on exam_enrollments for all to authenticated
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy submissions_member_read on submissions for select to authenticated
  using (is_org_member(organization_id));
