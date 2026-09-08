const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '') || '';

function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

/** @deprecated Use studentSession.fetchEnrolledExams after login */
export async function fetchActiveExams() {
  const res = await fetch(apiUrl('/api/exams'));
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load exams');
  return data.exams;
}

/** @deprecated Use studentSession.fetchEnrolledExam after login */
export async function fetchExam(id) {
  const res = await fetch(apiUrl(`/api/exams/${id}`));
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load exam');
  return data.exam;
}
