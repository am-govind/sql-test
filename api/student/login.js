import {
  checkLoginRateLimit,
  recordFailedLogin,
  clearLoginAttempts,
  signStudentToken,
  normalizeDob,
} from '../_lib/student-auth.js';
import { authenticateStudent } from '../_lib/students.js';
import { readJsonBody, sendJson } from '../_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || 'unknown';

  const rate = checkLoginRateLimit(ip);
  if (!rate.allowed) {
    sendJson(res, 429, {
      error: `Too many login attempts. Try again in ${rate.retryAfterSec} seconds.`,
    });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const identifier = body.identifier?.trim();
    const dob = normalizeDob(body.dob);

    if (!identifier || !dob) {
      sendJson(res, 400, { error: 'Roll number or email and date of birth are required' });
      return;
    }

    const result = await authenticateStudent(identifier, dob);
    if (!result.ok) {
      recordFailedLogin(ip);
      sendJson(res, result.status, { error: result.error });
      return;
    }

    clearLoginAttempts(ip);
    const token = signStudentToken(result.student.id);

    sendJson(res, 200, {
      token,
      student: result.student,
    });
  } catch (err) {
    console.error('[api/student/login]', err);
    sendJson(res, 500, { error: 'Login failed' });
  }
}
