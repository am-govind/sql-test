import { createSubmission } from './_lib/submissions.js';
import { createProctoringEvent } from './_lib/proctoring.js';
import { requireStudent } from './_lib/student-auth.js';
import { readJsonBody, sendJson } from './_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const auth = requireStudent(req);
  if (auth.error) {
    sendJson(res, auth.status, { error: auth.error });
    return;
  }

  try {
    const body = await readJsonBody(req);
    if (body.proctoringEvent) {
      const result = await createProctoringEvent({
        studentId: auth.studentId,
        examId: body.examId,
        submissionId: body.submissionId,
        violationType: body.violationType,
        confidence: body.confidence,
      });
      sendJson(res, result.ok ? 201 : result.status, result.ok ? result : { error: result.error });
      return;
    }
    const result = await createSubmission({
      studentId: auth.studentId,
      examId: body.examId,
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
