const STORAGE_KEY = 'sqlproctor_student_token_v1';
const PROFILE_KEY = 'sqlproctor_student_profile_v1';

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '') || '';

function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getStudentToken() {
  return sessionStorage.getItem(STORAGE_KEY);
}

export function getStudentProfile() {
  try {
    const raw = sessionStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStudentSession({ token, student }) {
  sessionStorage.setItem(STORAGE_KEY, token);
  sessionStorage.setItem(PROFILE_KEY, JSON.stringify(student));
}

export function clearStudentSession() {
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(PROFILE_KEY);
}

export function isStudentLoggedIn() {
  return Boolean(getStudentToken());
}

export async function studentFetch(path, options = {}) {
  const token = getStudentToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(apiUrl(path), { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    clearStudentSession();
  }

  if (!response.ok) {
    const err = new Error(data.error || `Request failed (${response.status})`);
    err.status = response.status;
    throw err;
  }

  return data;
}

export async function studentLogin(identifier, dob) {
  const res = await fetch(apiUrl('/api/student/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, dob }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Login failed');
    err.status = res.status;
    throw err;
  }
  setStudentSession({ token: data.token, student: data.student });
  return data;
}

export async function fetchEnrolledExams() {
  const { exams } = await studentFetch('/api/student/exams');
  return exams;
}

export async function fetchEnrolledExam(id) {
  const data = await studentFetch(`/api/student/exams/${id}`);
  return data;
}

export async function postStudentSubmission(payload) {
  return studentFetch('/api/submissions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
