import { requireAdmin } from '../_lib/auth.js';
import { computeAnalytics } from '../_lib/analytics.js';
import { sendJson } from '../_lib/http.js';

export default async function handler(req, res) {
  const auth = await requireAdmin(req);
  if (auth.error) {
    sendJson(res, auth.status, { error: auth.error });
    return;
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const examId = req.query.examId || null;
    const analytics = await computeAnalytics({ examId });
    sendJson(res, 200, { analytics });
  } catch (err) {
    console.error('[api/admin/analytics]', err);
    sendJson(res, 500, { error: 'Failed to compute analytics' });
  }
}
