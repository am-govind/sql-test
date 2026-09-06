import { createServiceClient } from '../_lib/supabase.js';

function scoreBucket(percentage) {
  if (percentage >= 85) return '85-100';
  if (percentage >= 70) return '70-84';
  if (percentage >= 60) return '60-69';
  if (percentage >= 40) return '40-59';
  return '0-39';
}

export async function listSubmissions({ examId }) {
  const supabase = createServiceClient();
  let query = supabase
    .from('submissions')
    .select('id, exam_id, student_name, roll_number, submission_reason, analytics, violations, submitted_at')
    .order('submitted_at', { ascending: false });

  if (examId) query = query.eq('exam_id', examId);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row, index) => ({
    id: row.id,
    examId: row.exam_id,
    rank: index + 1,
    studentName: row.student_name,
    rollNumber: row.roll_number,
    submissionReason: row.submission_reason,
    percentage: row.analytics?.percentage ?? 0,
    grade: row.analytics?.grade?.label ?? '—',
    completedCount: row.analytics?.completedCount ?? 0,
    totalCount: row.analytics?.totalCount ?? 0,
    totalTimeTakenSec: row.analytics?.totalTimeTakenSec ?? 0,
    totalViolations: row.analytics?.totalViolations ?? (row.violations?.length ?? 0),
    submittedAt: row.submitted_at,
  }));
}

export async function getSubmission(id) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('submissions')
    .select('*, exams(title)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    examId: data.exam_id,
    examTitle: data.exams?.title ?? 'Exam',
    studentName: data.student_name,
    rollNumber: data.roll_number,
    submissionReason: data.submission_reason,
    analytics: data.analytics,
    violations: data.violations || [],
    lessonResults: data.lesson_results || [],
    submittedAt: data.submitted_at,
  };
}

export async function computeAnalytics({ examId }) {
  const supabase = createServiceClient();
  let query = supabase
    .from('submissions')
    .select('id, student_name, roll_number, analytics, violations, lesson_results, submitted_at, submission_reason');

  if (examId) query = query.eq('exam_id', examId);

  const { data, error } = await query;
  if (error) throw error;

  const rows = data || [];
  const total = rows.length;

  if (total === 0) {
    return {
      totalSubmissions: 0,
      avgScore: 0,
      passRate: 0,
      avgTimeSec: 0,
      violationRate: 0,
      scoreDistribution: { '0-39': 0, '40-59': 0, '60-69': 0, '70-84': 0, '85-100': 0 },
      leaderboard: [],
      lessonHeatmap: [],
      recentSubmissions: [],
      violationSummary: {},
    };
  }

  let scoreSum = 0;
  let passCount = 0;
  let timeSum = 0;
  let violationCount = 0;
  const distribution = { '0-39': 0, '40-59': 0, '60-69': 0, '70-84': 0, '85-100': 0 };
  const violationSummary = {};
  const lessonTotals = {};

  for (const row of rows) {
    const pct = row.analytics?.percentage ?? 0;
    scoreSum += pct;
    if (pct >= 70) passCount++;
    timeSum += row.analytics?.totalTimeTakenSec ?? 0;

    const vCount = row.analytics?.totalViolations ?? row.violations?.length ?? 0;
    if (vCount > 0) violationCount++;
    distribution[scoreBucket(pct)]++;

    for (const v of row.violations || []) {
      const key = v.type || v.label || 'unknown';
      violationSummary[key] = (violationSummary[key] || 0) + 1;
    }

    for (const lesson of row.lesson_results || []) {
      const id = lesson.lessonId;
      if (!lessonTotals[id]) lessonTotals[id] = { completed: 0, total: 0 };
      lessonTotals[id].total++;
      if (lesson.completed) lessonTotals[id].completed++;
    }
  }

  const leaderboard = rows
    .map((row) => ({
      id: row.id,
      studentName: row.student_name,
      rollNumber: row.roll_number,
      percentage: row.analytics?.percentage ?? 0,
      totalViolations: row.analytics?.totalViolations ?? row.violations?.length ?? 0,
      totalTimeTakenSec: row.analytics?.totalTimeTakenSec ?? 0,
      submittedAt: row.submitted_at,
    }))
    .sort((a, b) => {
      if (b.percentage !== a.percentage) return b.percentage - a.percentage;
      if (a.totalViolations !== b.totalViolations) return a.totalViolations - b.totalViolations;
      return a.totalTimeTakenSec - b.totalTimeTakenSec;
    })
    .slice(0, 10)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  const lessonHeatmap = Object.entries(lessonTotals)
    .map(([lessonId, stats]) => ({
      lessonId: Number(lessonId),
      completionRate: stats.total ? Math.round((stats.completed / stats.total) * 100) : 0,
      completed: stats.completed,
      total: stats.total,
    }))
    .sort((a, b) => a.lessonId - b.lessonId);

  const recentSubmissions = rows
    .slice()
    .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
    .slice(0, 10)
    .map((row) => ({
      id: row.id,
      studentName: row.student_name,
      rollNumber: row.roll_number,
      percentage: row.analytics?.percentage ?? 0,
      submittedAt: row.submitted_at,
    }));

  return {
    totalSubmissions: total,
    avgScore: Math.round(scoreSum / total),
    passRate: Math.round((passCount / total) * 100),
    avgTimeSec: Math.round(timeSum / total),
    violationRate: Math.round((violationCount / total) * 100),
    scoreDistribution: distribution,
    leaderboard,
    lessonHeatmap,
    recentSubmissions,
    violationSummary,
  };
}
