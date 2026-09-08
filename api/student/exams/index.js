import { requireStudent } from '../_lib/student-auth.js';
import { listEnrolledExamsForStudent } from '../_lib/students.js';
import { sendJson } from '../_lib/http.js';

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

  try {
    const exams = await listEnrolledExamsForStudent(auth.studentId);
    sendJson(res, 200, { exams });
  } catch (err) {
    console.error('[api/student/exams]', err);
    sendJson(res, 500, { error: 'Failed to load exams' });
  }
}
