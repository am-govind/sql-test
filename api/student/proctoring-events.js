import { requireStudent } from '../_lib/student-auth.js';
import { readJsonBody, sendJson } from '../_lib/http.js';
import { createProctoringEvent } from '../_lib/proctoring.js';

export default async function handler(req, res) {
  const auth = requireStudent(req);
  if (auth.error) {
    sendJson(res, auth.status, { error: auth.error });
    return;
  }
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const result = await createProctoringEvent({
      studentId: auth.studentId,
      examId: body.examId,
      submissionId: body.submissionId,
      violationType: body.violationType,
      confidence: body.confidence,
    });
    sendJson(res, result.ok ? 201 : result.status, result.ok ? result : { error: result.error });
  } catch (err) {
    console.error('[api/student/proctoring-events POST]', err);
    sendJson(res, 500, { error: 'Failed to create proctoring event' });
  }
}
