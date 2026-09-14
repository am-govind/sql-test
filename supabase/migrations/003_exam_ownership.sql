-- Each exam belongs to the admin who created it.
ALTER TABLE exams
  ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX exams_created_by_idx ON exams (created_by);

DROP POLICY IF EXISTS exams_admin_all ON exams;
CREATE POLICY exams_admin_own ON exams
  FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
