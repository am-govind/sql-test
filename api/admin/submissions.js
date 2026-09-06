import { requireAdmin } from '../_lib/auth.js';
import { listSubmissions, getSubmission } from '../_lib/submissions.js';
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
    const { examId, id } = req.query;

    if (id) {
      const submission = await getSubmission(id);
      if (!submission) {
        sendJson(res, 404, { error: 'Submission not found' });
        return;
      }
      sendJson(res, 200, { submission });
      return;
    }

    const submissions = await listSubmissions({ examId });
    sendJson(res, 200, { submissions });
  } catch (err) {
    console.error('[api/admin/submissions]', err);
    sendJson(res, 500, { error: 'Failed to load submissions' });
  }
}
