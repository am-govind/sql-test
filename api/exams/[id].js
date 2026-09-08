import { sendJson } from '../_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  sendJson(res, 403, { error: 'Use /api/student/exams/:id after student login' });
}
