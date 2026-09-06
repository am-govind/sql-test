import { createSubmission } from './_lib/submissions.js';
import { readJsonBody, sendJson } from './_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const result = await createSubmission({
      examId: body.examId,
      studentName: body.studentName,
      rollNumber: body.rollNumber,
      submissionReason: body.submissionReason,
      analytics: body.analytics,
      violations: body.violations,
      lessonResults: body.lessonResults,
    });

    if (!result.ok) {
      sendJson(res, result.status, { error: result.error });
      return;
    }

    sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error('[api/submissions]', err);
    sendJson(res, 500, { error: 'Failed to save submission' });
  }
}
