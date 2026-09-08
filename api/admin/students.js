import { requireAdmin } from '../_lib/auth.js';
import { listStudents, createStudent } from '../_lib/students.js';
import { readJsonBody, sendJson } from '../_lib/http.js';

export default async function handler(req, res) {
  const auth = await requireAdmin(req);
  if (auth.error) {
    sendJson(res, auth.status, { error: auth.error });
    return;
  }

  try {
    if (req.method === 'GET') {
      const students = await listStudents();
      sendJson(res, 200, { students });
      return;
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const result = await createStudent({
        fullName: body.fullName,
        rollNumber: body.rollNumber,
        email: body.email,
        dob: body.dob,
      });
      if (!result.ok) {
        sendJson(res, result.status, { error: result.error });
        return;
      }
      sendJson(res, 201, { student: result.student });
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('[api/admin/students]', err);
    sendJson(res, 500, { error: 'Request failed' });
  }
}
