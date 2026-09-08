import { createServiceClient } from '../_lib/supabase.js';
import { getEnrolledExamForStudent, getStudentById, hasStudentSubmitted } from '../_lib/students.js';

export async function createSubmission(payload) {
  const {
    studentId,
    examId,
    submissionReason,
    analytics,
    violations,
    lessonResults,
  } = payload;

  if (!studentId || !examId) {
    return { ok: false, status: 400, error: 'studentId and examId are required' };
  }

  const examResult = await getEnrolledExamForStudent(studentId, examId);
  if (!examResult.ok) {
    return { ok: false, status: examResult.status, error: examResult.error };
  }

  if (examResult.alreadySubmitted) {
    return { ok: false, status: 409, error: 'You have already submitted this exam' };
  }

  const student = await getStudentById(studentId);
  if (!student) {
    return { ok: false, status: 401, error: 'Student not found' };
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from('submissions').insert({
    exam_id: examId,
    student_id: studentId,
    student_name: student.fullName,
    roll_number: student.rollNumber,
    status: 'submitted',
    submission_reason: submissionReason || 'manual',
    analytics: analytics || {},
    violations: violations || [],
    lesson_results: lessonResults || [],
    submitted_at: new Date().toISOString(),
  });

  if (error) {
    if (error.code === '23505') {
      return { ok: false, status: 409, error: 'You have already submitted this exam' };
    }
    throw error;
  }

  return { ok: true };
}

export async function checkSubmissionStatus(studentId, examId) {
  return hasStudentSubmitted(studentId, examId);
}

export async function listSubmissions({ examId }) {
  const supabase = createServiceClient();
  let query = supabase
    .from('submissions')
    .select('id, exam_id, student_id, student_name, roll_number, submission_reason, analytics, violations, submitted_at')
    .order('submitted_at', { ascending: false });

  if (examId) query = query.eq('exam_id', examId);

  const { data, error } = await query;
  if (error) throw error;

  return (data || [])
    .map((row) => ({
      id: row.id,
      examId: row.exam_id,
      studentId: row.student_id,
      studentName: row.student_name,
      rollNumber: row.roll_number,
      submissionReason: row.submission_reason,
      percentage: row.analytics?.percentage ?? 0,
      grade: row.analytics?.grade?.label ?? '—',
      completedCount: row.analytics?.completedCount ?? 0,
      totalCount: row.analytics?.totalCount ?? 0,
      totalTimeTakenSec: row.analytics?.totalTimeTakenSec ?? 0,
      totalViolations: row.analytics?.totalViolations ?? (row.violations?.length ?? 0),
      submittedAt: row.submitted_at,
    }))
    .sort((a, b) => {
      if (b.percentage !== a.percentage) return b.percentage - a.percentage;
      if (a.totalViolations !== b.totalViolations) return a.totalViolations - b.totalViolations;
      return a.totalTimeTakenSec - b.totalTimeTakenSec;
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function getSubmission(id) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('submissions')
    .select('*, exams(title)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    examId: data.exam_id,
    studentId: data.student_id,
    examTitle: data.exams?.title ?? 'Exam',
    studentName: data.student_name,
    rollNumber: data.roll_number,
    submissionReason: data.submission_reason,
    analytics: data.analytics,
    violations: data.violations || [],
    lessonResults: data.lesson_results || [],
    submittedAt: data.submitted_at,
  };
}
