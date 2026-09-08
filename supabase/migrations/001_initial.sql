-- SQLBolt Proctored Exam Platform — initial schema

CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  lesson_ids INTEGER[] NOT NULL DEFAULT '{}',
  duration_sec INTEGER NOT NULL DEFAULT 2700,
  proctor_mode TEXT NOT NULL DEFAULT 'strike_1'
    CHECK (proctor_mode IN ('strict', 'strike_1')),
  fullscreen_enforced BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  roll_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  submission_reason TEXT,
  analytics JSONB NOT NULL DEFAULT '{}',
  violations JSONB NOT NULL DEFAULT '[]',
  lesson_results JSONB NOT NULL DEFAULT '[]',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exam_id, roll_number)
);

CREATE INDEX submissions_exam_id_idx ON submissions (exam_id);
CREATE INDEX submissions_submitted_at_idx ON submissions (submitted_at DESC);
CREATE INDEX exams_status_idx ON exams (status);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER exams_set_updated_at
  BEFORE UPDATE ON exams
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY exams_public_read_active ON exams
  FOR SELECT
  USING (status = 'active');

CREATE POLICY exams_admin_all ON exams
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY submissions_admin_read ON submissions
  FOR SELECT
  TO authenticated
  USING (true);
