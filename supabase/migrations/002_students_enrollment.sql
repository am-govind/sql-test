-- Global student roster, per-exam enrollment, submission linkage

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  roll_number TEXT NOT NULL,
  email TEXT,
  dob_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT students_roll_number_unique UNIQUE (roll_number)
);

CREATE UNIQUE INDEX students_email_unique_idx ON students (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX students_roll_lower_idx ON students (lower(roll_number));

CREATE TABLE exam_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exam_id, student_id)
);

CREATE INDEX exam_enrollments_exam_id_idx ON exam_enrollments (exam_id);
CREATE INDEX exam_enrollments_student_id_idx ON exam_enrollments (student_id);

ALTER TABLE submissions
  ADD COLUMN student_id UUID REFERENCES students(id) ON DELETE SET NULL;

CREATE INDEX submissions_student_id_idx ON submissions (student_id);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY students_admin_all ON students
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY exam_enrollments_admin_all ON exam_enrollments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Drop public exam listing now that students authenticate via API.
DROP POLICY IF EXISTS exams_public_read_active ON exams;
