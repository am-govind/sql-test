import crypto from 'node:crypto';
import { createServiceClient } from './supabase.js';
import { getEnrolledExamForStudent } from './students.js';

const EVENT_TYPES = new Set([
  'multiple_faces',
  'no_face_detected',
  'phone_detected',
  'tablet_detected',
  'camera_blocked',
  'rapid_movement',
  'audio_anomaly',
]);

export async function createProctoringEvent({ studentId, examId, submissionId, violationType, confidence }) {
  if (!EVENT_TYPES.has(violationType)) {
    return { ok: false, status: 400, error: 'Unsupported violation type' };
  }
  if (confidence !== undefined && confidence !== null && (Number.isNaN(Number(confidence)) || confidence < 0 || confidence > 1)) {
    return { ok: false, status: 400, error: 'Confidence must be between 0 and 1' };
  }

  const access = await getEnrolledExamForStudent(studentId, examId);
  if (!access.ok) return access;

  const organizationId = access.exam.organizationId;
  const supabase = createServiceClient();

  if (submissionId) {
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('id')
      .eq('id', submissionId)
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (submissionError) throw submissionError;
    if (!submission) return { ok: false, status: 404, error: 'Submission not found' };
  }

  const eventId = crypto.randomUUID();
  const snapshotPath = `${organizationId}/${examId}/${studentId}/${eventId}.jpg`;
  const { data: event, error } = await supabase
    .from('proctoring_events')
    .insert({
      id: eventId,
      organization_id: organizationId,
      exam_id: examId,
      student_id: studentId,
      submission_id: submissionId || null,
      violation_type: violationType,
      confidence: confidence === undefined || confidence === null ? null : Number(confidence),
      snapshot_path: snapshotPath,
    })
    .select('id, violation_type, confidence, detected_at, snapshot_path, review_status')
    .single();
  if (error) throw error;

  const { data: upload, error: uploadError } = await supabase.storage
    .from('proctoring-snapshots')
    .createSignedUploadUrl(snapshotPath);
  if (uploadError) throw uploadError;

  return {
    ok: true,
    event,
    upload: { path: snapshotPath, token: upload.token },
  };
}

const REVIEW_STATUSES = new Set(['pending', 'cheating', 'not_cheating', 'needs_review']);

async function withSignedSnapshotUrl(supabase, row) {
  if (!row.snapshot_path) return { ...row, snapshot_url: null };
  const { data, error } = await supabase.storage
    .from('proctoring-snapshots')
    .createSignedUrl(row.snapshot_path, 300);
  if (error) throw error;
  return { ...row, snapshot_url: data?.signedUrl || null };
}

export async function listProctoringEvents({ organizationId, examId, submissionId, reviewStatus }) {
  const supabase = createServiceClient();
  let query = supabase
    .from('proctoring_events')
    .select('id, exam_id, student_id, submission_id, violation_type, confidence, detected_at, snapshot_path, review_status, reviewed_by, reviewed_at, review_notes, students!proctoring_events_student_org_fkey(full_name, roll_number), exams!proctoring_events_exam_org_fkey(title)')
    .eq('organization_id', organizationId)
    .order('detected_at', { ascending: false });
  if (examId) query = query.eq('exam_id', examId);
  if (submissionId) query = query.eq('submission_id', submissionId);
  if (reviewStatus && REVIEW_STATUSES.has(reviewStatus)) query = query.eq('review_status', reviewStatus);

  const { data, error } = await query;
  if (error) throw error;
  return Promise.all((data || []).map((row) => withSignedSnapshotUrl(supabase, {
    id: row.id,
    examId: row.exam_id,
    examTitle: row.exams?.title || 'Exam',
    studentId: row.student_id,
    studentName: row.students?.full_name || 'Student',
    rollNumber: row.students?.roll_number || '',
    submissionId: row.submission_id,
    violationType: row.violation_type,
    confidence: row.confidence,
    detectedAt: row.detected_at,
    snapshotPath: row.snapshot_path,
    reviewStatus: row.review_status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNotes: row.review_notes,
  })));
}

export async function reviewProctoringEvent({ id, organizationId, reviewerId, reviewStatus, reviewNotes }) {
  if (!REVIEW_STATUSES.has(reviewStatus) || reviewStatus === 'pending') {
    return { ok: false, status: 400, error: 'A final review status is required' };
  }
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('proctoring_events')
    .update({
      review_status: reviewStatus,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes?.trim() || null,
    })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select('id, review_status, reviewed_by, reviewed_at, review_notes')
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false, status: 404, error: 'Proctoring event not found' };
  return { ok: true, event: data };
}
