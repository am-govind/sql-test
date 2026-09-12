import { requireAdmin } from '../_lib/auth.js';
import { listSubmissions, getSubmission, deleteSubmission } from '../_lib/submissions.js';
import { sendJson } from '../_lib/http.js';

export default async function handler(req, res) {
  const auth = await requireAdmin(req);
  if (auth.error) {
    sendJson(res, auth.status, { error: auth.error });
    return;
  }

  if (req.method === 'GET') {
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
      return;
    } catch (err) {
      console.error('[api/admin/submissions GET]', err);
      sendJson(res, 500, { error: 'Failed to load submissions' });
      return;
    }
  }

  if (req.method === 'DELETE') {
    try {
      const id = req.query.id || req.body?.id;
      if (!id) {
        sendJson(res, 400, { error: 'Submission id is required' });
        return;
      }

      const result = await deleteSubmission(id);
      if (!result.ok) {
        sendJson(res, result.status || 400, { error: result.error });
        return;
      }

      sendJson(res, 200, { ok: true, deleted: result.deleted });
      return;
    } catch (err) {
      console.error('[api/admin/submissions DELETE]', err);
      sendJson(res, 500, { error: 'Failed to delete submission' });
      return;
    }
  }

  sendJson(res, 405, { error: 'Method not allowed' });
}

