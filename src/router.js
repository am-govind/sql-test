/**
 * Lightweight history-based client router.
 */

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '') || '';

export function getPathname() {
  let path = window.location.pathname;
  if (BASE && path.startsWith(BASE)) {
    path = path.slice(BASE.length) || '/';
  }
  if (!path.startsWith('/')) path = `/${path}`;
  return path;
}

export function navigate(path, { replace = false } = {}) {
  const target = `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
  if (replace) {
    window.history.replaceState({}, '', target);
  } else {
    window.history.pushState({}, '', target);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * @returns {{
 *   name: string,
 *   params: Record<string, string>,
 *   query: Record<string, string>
 * }}
 */
export function matchRoute(pathname) {
  const query = {};
  const qIndex = pathname.indexOf('?');
  let path = pathname;
  if (qIndex >= 0) {
    path = pathname.slice(0, qIndex);
    new URLSearchParams(pathname.slice(qIndex + 1)).forEach((v, k) => {
      query[k] = v;
    });
  }

  const routes = [
    { name: 'adminLogin', pattern: /^\/admin\/login$/ },
    { name: 'adminDashboard', pattern: /^\/admin$/ },
    { name: 'adminExams', pattern: /^\/admin\/exams$/ },
    { name: 'adminExamNew', pattern: /^\/admin\/exams\/new$/ },
    { name: 'adminExamEdit', pattern: /^\/admin\/exams\/([^/]+)\/edit$/ },
    { name: 'adminExamSubmissions', pattern: /^\/admin\/exams\/([^/]+)\/submissions$/ },
    { name: 'adminSubmissionDetail', pattern: /^\/admin\/submissions\/([^/]+)$/ },
    { name: 'studentExamDone', pattern: /^\/exam\/([^/]+)\/done$/ },
    { name: 'studentExamTake', pattern: /^\/exam\/([^/]+)\/take$/ },
    { name: 'studentExamEntry', pattern: /^\/exam\/([^/]+)$/ },
    { name: 'studentHome', pattern: /^\/$/ },
  ];

  for (const route of routes) {
    const match = path.match(route.pattern);
    if (!match) continue;

    const params = {};
    if (route.name === 'adminExamEdit' || route.name === 'adminExamSubmissions') {
      params.examId = match[1];
    } else if (route.name === 'adminSubmissionDetail') {
      params.submissionId = match[1];
    } else if (
      route.name === 'studentExamEntry'
      || route.name === 'studentExamTake'
      || route.name === 'studentExamDone'
    ) {
      params.examId = match[1];
    }

    return { name: route.name, params, query };
  }

  return { name: 'notFound', params: {}, query };
}

export function examPath(examId, segment = '') {
  const base = `/exam/${examId}`;
  return segment ? `${base}/${segment}` : base;
}

export function adminPath(segment = '') {
  return segment ? `/admin/${segment}` : '/admin';
}
