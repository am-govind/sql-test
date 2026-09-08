import { createServiceClient } from './supabase.js';
import { hashDob, verifyDob } from './student-auth.js';
import { mapExamRow } from './exams.js';

export function mapStudentRow(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    rollNumber: row.roll_number,
    email: row.email || null,
    createdAt: row.created_at,
  };
}

export async function findStudentByIdentifier(identifier) {
  const supabase = createServiceClient();
  const id = identifier.trim();
  if (!id) return null;

  const cols = 'id, full_name, roll_number, email, dob_hash, created_at';

  const { data: byRoll, error: rollError } = await supabase
    .from('students')
    .select(cols)
    .ilike('roll_number', id)
    .maybeSingle();

  if (rollError) throw rollError;
  if (byRoll) return byRoll;

  const { data: byEmail, error: emailError } = await supabase
    .from('students')
    .select(cols)
    .ilike('email', id)
    .maybeSingle();

  if (emailError) throw emailError;
  return byEmail;
}

export async function authenticateStudent(identifier, dob) {
  const student = await findStudentByIdentifier(identifier);
  if (!student) return { ok: false, status: 401, error: 'Invalid credentials' };

  const valid = await verifyDob(dob, student.dob_hash);
  if (!valid) return { ok: false, status: 401, error: 'Invalid credentials' };

  return {
    ok: true,
    student: mapStudentRow(student),
  };
}

export async function listStudents() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('students')
    .select('id, full_name, roll_number, email, created_at')
    .order('full_name', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapStudentRow);
}

export async function batchCreateStudents(studentsList) {
  const supabase = createServiceClient();
  const results = { inserted: 0, updated: 0, errors: [] };

  for (let i = 0; i < studentsList.length; i++) {
    const s = studentsList[i];
    if (!s.fullName || !s.rollNumber || !s.dob) {
      results.errors.push({ row: i + 1, error: 'Full name, roll number, and date of birth are required' });
      continue;
    }

    try {
      const dobHash = await hashDob(s.dob);
      const { data: existing } = await supabase
        .from('students')
        .select('id')
        .eq('roll_number', s.rollNumber.trim())
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('students')
          .update({
            full_name: s.fullName.trim(),
            email: s.email?.trim() || null,
            dob_hash: dobHash,
          })
          .eq('id', existing.id);

        if (error) {
          results.errors.push({ row: i + 1, error: error.message });
        } else {
          results.updated += 1;
        }
      } else {
        const { error } = await supabase
          .from('students')
          .insert({
            full_name: s.fullName.trim(),
            roll_number: s.rollNumber.trim(),
            email: s.email?.trim() || null,
            dob_hash: dobHash,
          });

        if (error) {
          results.errors.push({ row: i + 1, error: error.message });
        } else {
          results.inserted += 1;
        }
      }
    } catch (err) {
      results.errors.push({ row: i + 1, error: err.message });
    }
  }

  return results;
}

export async function createStudent({ fullName, rollNumber, email, dob }) {
  const supabase = createServiceClient();
  const dobHash = await hashDob(dob);

  const { data, error } = await supabase
    .from('students')
    .insert({
      full_name: fullName.trim(),
      roll_number: rollNumber.trim(),
      email: email?.trim() || null,
      dob_hash: dobHash,
    })
    .select('id, full_name, roll_number, email, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { ok: false, status: 409, error: 'Roll number or email already exists' };
    }
    throw error;
  }

  return { ok: true, student: mapStudentRow(data) };
}

export async function updateStudent(id, { fullName, rollNumber, email, dob }) {
  const supabase = createServiceClient();
  const payload = {
    full_name: fullName?.trim(),
    roll_number: rollNumber?.trim(),
    email: email?.trim() || null,
  };
  if (dob) payload.dob_hash = await hashDob(dob);

  const { data, error } = await supabase
    .from('students')
    .update(payload)
    .eq('id', id)
    .select('id, full_name, roll_number, email, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { ok: false, status: 409, error: 'Roll number or email already exists' };
    }
    throw error;
  }

  return { ok: true, student: mapStudentRow(data) };
}

export async function deleteStudent(id) {
  const supabase = createServiceClient();
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) throw error;
}

export async function isStudentEnrolled(studentId, examId) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('exam_enrollments')
    .select('id')
    .eq('student_id', studentId)
    .eq('exam_id', examId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function hasStudentSubmitted(studentId, examId) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('submissions')
    .select('id')
    .eq('student_id', studentId)
    .eq('exam_id', examId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function listEnrolledExamsForStudent(studentId) {
  const supabase = createServiceClient();

  const { data: enrollments, error: enrollError } = await supabase
    .from('exam_enrollments')
    .select('exam_id')
    .eq('student_id', studentId);

  if (enrollError) throw enrollError;
  if (!enrollments || enrollments.length === 0) return [];

  const examIds = enrollments.map((e) => e.exam_id);

  const { data: exams, error: examsError } = await supabase
    .from('exams')
    .select('id, title, description, lesson_ids, duration_sec, status')
    .in('id', examIds)
    .eq('status', 'active');

  if (examsError) throw examsError;
  if (!exams || exams.length === 0) return [];

  const { data: submitted, error: subError } = await supabase
    .from('submissions')
    .select('exam_id')
    .eq('student_id', studentId);

  if (subError) throw subError;

  const submittedIds = new Set((submitted || []).map((s) => s.exam_id));

  return exams.map((exam) => ({
    id: exam.id,
    title: exam.title,
    description: exam.description,
    lessonCount: exam.lesson_ids?.length ?? 0,
    durationSec: exam.duration_sec,
    alreadySubmitted: submittedIds.has(exam.id),
  }));
}

export async function getEnrolledExamForStudent(studentId, examId) {
  const enrolled = await isStudentEnrolled(studentId, examId);
  if (!enrolled) return { ok: false, status: 403, error: 'Not enrolled in this exam' };

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('id', examId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  if (!data) return { ok: false, status: 404, error: 'Exam not found or not active' };

  const alreadySubmitted = await hasStudentSubmitted(studentId, examId);

  return {
    ok: true,
    exam: mapExamRow(data),
    alreadySubmitted,
  };
}

export async function listEnrollmentsForExam(examId) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('exam_enrollments')
    .select('id, student_id, enrolled_at, students(id, full_name, roll_number, email)')
    .eq('exam_id', examId)
    .order('enrolled_at', { ascending: true });

  if (error) throw error;

  return (data || []).map((row) => ({
    enrollmentId: row.id,
    studentId: row.student_id,
    enrolledAt: row.enrolled_at,
    fullName: row.students?.full_name,
    rollNumber: row.students?.roll_number,
    email: row.students?.email,
  }));
}

export async function setExamEnrollments(examId, studentIds) {
  const supabase = createServiceClient();
  const uniqueIds = [...new Set(studentIds)];

  const { error: deleteError } = await supabase
    .from('exam_enrollments')
    .delete()
    .eq('exam_id', examId);

  if (deleteError) throw deleteError;

  if (!uniqueIds.length) return [];

  const rows = uniqueIds.map((studentId) => ({
    exam_id: examId,
    student_id: studentId,
  }));

  const { data, error } = await supabase
    .from('exam_enrollments')
    .insert(rows)
    .select('id, student_id');

  if (error) throw error;
  return data || [];
}

export async function getStudentById(studentId) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('students')
    .select('id, full_name, roll_number, email, created_at')
    .eq('id', studentId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapStudentRow(data);
}
