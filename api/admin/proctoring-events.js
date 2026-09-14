import { requireAdmin } from '../_lib/auth.js';
import { readJsonBody, sendJson } from '../_lib/http.js';
import { listProctoringEvents, reviewProctoringEvent } from '../_lib/proctoring.js';

export default async function handler(req, res) {
  const auth = await requireAdmin(req);
  if (auth.error) {
    sendJson(res, auth.status, { error: auth.error });
    return;
  }

  try {
    if (req.method === 'GET') {
      const { examId, submissionId, reviewStatus } = req.query;
      const events = await listProctoringEvents({
        organizationId: auth.organizationId,
        examId,
        submissionId,
        reviewStatus,
      });
      sendJson(res, 200, { events });
      return;
    }

    if (req.method === 'PATCH') {
      const id = req.query.id;
      if (!id) {
        sendJson(res, 400, { error: 'Event id is required' });
        return;
      }
      const body = await readJsonBody(req);
      const result = await reviewProctoringEvent({
        id,
        organizationId: auth.organizationId,
        reviewerId: auth.user.id,
        reviewStatus: body.reviewStatus,
        reviewNotes: body.reviewNotes,
      });
      sendJson(res, result.ok ? 200 : result.status, result.ok ? result : { error: result.error });
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('[api/admin/proctoring-events]', err);
    sendJson(res, 500, { error: 'Failed to process proctoring events' });
  }
}
