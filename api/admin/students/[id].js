import { requireAdmin } from '../../_lib/auth.js';
import { updateStudent, deleteStudent } from '../../_lib/students.js';
import { readJsonBody, sendJson } from '../../_lib/http.js';

export default async function handler(req, res) {
  const auth = await requireAdmin(req);
  if (auth.error) {
    sendJson(res, auth.status, { error: auth.error });
    return;
  }

  const id = req.query.id;
  if (!id) {
    sendJson(res, 400, { error: 'Student id required' });
    return;
  }

  try {
    if (req.method === 'PATCH') {
      const body = await readJsonBody(req);
      const result = await updateStudent(id, {
        fullName: body.fullName,
        rollNumber: body.rollNumber,
        email: body.email,
        dob: body.dob,
      });
      if (!result.ok) {
        sendJson(res, result.status, { error: result.error });
        return;
      }
      sendJson(res, 200, { student: result.student });
      return;
    }

    if (req.method === 'DELETE') {
      await deleteStudent(id);
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('[api/admin/students/[id]]', err);
    sendJson(res, 500, { error: 'Request failed' });
  }
}
