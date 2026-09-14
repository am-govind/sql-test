create index if not exists submissions_org_exam_submitted_idx
on public.submissions (organization_id, exam_id, submitted_at desc);
