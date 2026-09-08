import { requireAdmin } from '../../_lib/auth.js';
import { listEnrollmentsForExam, setExamEnrollments } from '../../_lib/students.js';
import { readJsonBody, sendJson } from '../../_lib/http.js';

export default async function handler(req, res) {
  const auth = await requireAdmin(req);
  if (auth.error) {
    sendJson(res, auth.status, { error: auth.error });
    return;
  }

  const examId = req.query.examId;
  if (!examId) {
    sendJson(res, 400, { error: 'Exam id required' });
    return;
  }

  try {
    if (req.method === 'GET') {
      const enrollments = await listEnrollmentsForExam(examId);
      sendJson(res, 200, { enrollments });
      return;
    }

    if (req.method === 'PUT') {
      const body = await readJsonBody(req);
      const studentIds = Array.isArray(body.studentIds) ? body.studentIds : [];
      await setExamEnrollments(examId, studentIds);
      const enrollments = await listEnrollmentsForExam(examId);
      sendJson(res, 200, { enrollments });
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('[api/admin/exams/enrollments]', err);
    sendJson(res, 500, { error: 'Request failed' });
  }
}
