-- Standardized, organization-scoped proctoring violation events.
-- Detection and snapshot upload are implemented separately; this migration
-- defines the durable event and review model.

create table if not exists public.proctoring_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  exam_id uuid not null,
  student_id uuid not null,
  submission_id uuid,
  violation_type text not null,
  confidence numeric(5, 4),
  detected_at timestamptz not null default now(),
  snapshot_path text,
  review_status text not null default 'pending',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,

  constraint proctoring_events_violation_type_check check (
    violation_type in (
      'multiple_faces',
      'no_face_detected',
      'phone_detected',
      'tablet_detected',
      'camera_blocked',
      'rapid_movement',
      'audio_anomaly'
    )
  ),
  constraint proctoring_events_confidence_check check (
    confidence is null or (confidence >= 0 and confidence <= 1)
  ),
  constraint proctoring_events_review_status_check check (
    review_status in ('pending', 'cheating', 'not_cheating', 'needs_review')
  ),
  constraint proctoring_events_reviewed_at_check check (
    review_status = 'pending' or reviewed_at is not null
  )
);

-- These composite references prevent an event from linking records across
-- organizations, even when a valid ID from another tenant is supplied.
create unique index if not exists submissions_id_organization_unique
  on public.submissions(id, organization_id);

alter table public.proctoring_events
  add constraint proctoring_events_exam_org_fkey
    foreign key (exam_id, organization_id)
    references public.exams(id, organization_id)
    on delete cascade;

alter table public.proctoring_events
  add constraint proctoring_events_student_org_fkey
    foreign key (student_id, organization_id)
    references public.students(id, organization_id)
    on delete cascade;

alter table public.proctoring_events
  add constraint proctoring_events_submission_org_fkey
    foreign key (submission_id, organization_id)
    references public.submissions(id, organization_id)
    on delete cascade;

create index if not exists proctoring_events_org_exam_idx
  on public.proctoring_events (organization_id, exam_id, detected_at desc);

create index if not exists proctoring_events_org_student_idx
  on public.proctoring_events (organization_id, student_id, detected_at desc);

create index if not exists proctoring_events_submission_idx
  on public.proctoring_events (submission_id);

create index if not exists proctoring_events_review_status_idx
  on public.proctoring_events (organization_id, review_status, detected_at desc);
