import { requireAdmin } from '../_lib/auth.js';
import { listSubmissions, getSubmission, deleteSubmission } from '../_lib/submissions.js';
import { listProctoringEvents, reviewProctoringEvent } from '../_lib/proctoring.js';
import { readJsonBody, sendJson } from '../_lib/http.js';

export default async function handler(req, res) {
  const auth = await requireAdmin(req);
  if (auth.error) {
    sendJson(res, auth.status, { error: auth.error });
    return;
  }

  if (req.method === 'GET') {
    try {
      const { examId, id } = req.query;

      if (req.query.proctoringEvents === 'true') {
        const events = await listProctoringEvents({
          organizationId: auth.organizationId,
          examId,
          submissionId: req.query.submissionId,
          reviewStatus: req.query.reviewStatus,
        });
        sendJson(res, 200, { events });
        return;
      }

      if (id) {
        const submission = await getSubmission(id, auth.organizationId);
        if (!submission) {
          sendJson(res, 404, { error: 'Submission not found' });
          return;
        }
        sendJson(res, 200, { submission });
        return;
      }

      const submissions = await listSubmissions({ examId, organizationId: auth.organizationId });
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

      const result = await deleteSubmission(id, auth.organizationId);
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

  if (req.method === 'PATCH' && req.query.proctoringEventId) {
    try {
      const body = await readJsonBody(req);
      const result = await reviewProctoringEvent({
        id: req.query.proctoringEventId,
        organizationId: auth.organizationId,
        reviewerId: auth.user.id,
        reviewStatus: body.reviewStatus,
        reviewNotes: body.reviewNotes,
      });
      sendJson(res, result.ok ? 200 : result.status, result.ok ? result : { error: result.error });
      return;
    } catch (err) {
      console.error('[api/admin/submissions PATCH proctoring]', err);
      sendJson(res, 500, { error: 'Failed to review proctoring event' });
      return;
    }
  }

  sendJson(res, 405, { error: 'Method not allowed' });
}
