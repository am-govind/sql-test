import { createServiceClient } from '../_lib/supabase.js';

export async function listActiveExams() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('exams')
    .select('id, title, description, lesson_ids, duration_sec, status')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((exam) => ({
    id: exam.id,
    title: exam.title,
    description: exam.description,
    lessonCount: exam.lesson_ids?.length ?? 0,
    durationSec: exam.duration_sec,
  }));
}

export async function getActiveExam(id) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapExamRow(data);
}

export function mapExamRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    lessonIds: row.lesson_ids || [],
    durationSec: row.duration_sec,
    proctorMode: row.proctor_mode,
    fullscreenEnforced: row.fullscreen_enforced,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
