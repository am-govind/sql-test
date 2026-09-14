import { requireAdmin } from '../_lib/auth.js';
import { listStudents, createStudent, batchCreateStudents, updateStudent, deleteStudent } from '../_lib/students.js';
import { readJsonBody, sendJson } from '../_lib/http.js';

export default async function handler(req, res) {
  const auth = await requireAdmin(req);
  if (auth.error) {
    sendJson(res, auth.status, { error: auth.error });
    return;
  }

  try {
    if (req.query.id && req.method === 'PATCH') {
      const body = await readJsonBody(req);
      const result = await updateStudent(req.query.id, {
        fullName: body.fullName,
        rollNumber: body.rollNumber,
        email: body.email,
        dob: body.dob,
        organizationId: auth.organizationId,
      });
      sendJson(res, result.ok ? 200 : result.status, result.ok ? result : { error: result.error });
      return;
    }

    if (req.query.id && req.method === 'DELETE') {
      await deleteStudent(req.query.id, auth.organizationId);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'GET') {
      const students = await listStudents(auth.organizationId);
      sendJson(res, 200, { students });
      return;
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);

      // Batch upload
      if (Array.isArray(body.students)) {
        const results = await batchCreateStudents(body.students, auth.organizationId);
        sendJson(res, 200, results);
        return;
      }

      // Single creation
      const result = await createStudent({
        fullName: body.fullName,
        rollNumber: body.rollNumber,
        email: body.email,
        dob: body.dob,
        organizationId: auth.organizationId,
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
