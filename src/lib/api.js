const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '') || '';

function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function fetchActiveExams() {
  const res = await fetch(apiUrl('/api/exams'));
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load exams');
  return data.exams;
}

export async function fetchExam(id) {
  const res = await fetch(apiUrl(`/api/exams/${id}`));
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load exam');
  return data.exam;
}

export async function postSubmission(payload) {
  const res = await fetch(apiUrl('/api/submissions'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Failed to submit exam');
    err.status = res.status;
    throw err;
  }
  return data;
}
