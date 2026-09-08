import { requireStudent } from '../../_lib/student-auth.js';
import { getEnrolledExamForStudent } from '../../_lib/students.js';
import { sendJson } from '../../_lib/http.js';

export default async function handler(req, res) {
  const auth = requireStudent(req);
  if (auth.error) {
    sendJson(res, auth.status, { error: auth.error });
    return;
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const id = req.query.id;
  if (!id) {
    sendJson(res, 400, { error: 'Exam id required' });
    return;
  }

  try {
    const result = await getEnrolledExamForStudent(auth.studentId, id);
    if (!result.ok) {
      sendJson(res, result.status, { error: result.error });
      return;
    }

    sendJson(res, 200, {
      exam: result.exam,
      alreadySubmitted: result.alreadySubmitted,
    });
  } catch (err) {
    console.error('[api/student/exams/[id]]', err);
    sendJson(res, 500, { error: 'Failed to load exam' });
  }
}
