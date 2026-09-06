import { getActiveExam } from '../_lib/exams.js';
import { sendJson } from '../_lib/http.js';

export default async function handler(req, res) {
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
    const exam = await getActiveExam(id);
    if (!exam) {
      sendJson(res, 404, { error: 'Exam not found or not active' });
      return;
    }
    sendJson(res, 200, { exam });
  } catch (err) {
    console.error('[api/exams/[id]]', err);
    sendJson(res, 500, { error: 'Failed to load exam' });
  }
}
