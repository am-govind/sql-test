import { listActiveExams } from '../_lib/exams.js';
import { sendJson } from '../_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const exams = await listActiveExams();
    sendJson(res, 200, { exams });
  } catch (err) {
    console.error('[api/exams]', err);
    sendJson(res, 500, { error: 'Failed to load exams' });
  }
}
