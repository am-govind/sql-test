/**
 * Application entry and URL router.
 */

import './style.css';
import { matchRoute, navigate, examPath } from './router.js';
import { state } from './services/state.js';
import { requireAdminSession, supabaseConfigured } from './lib/supabase.js';
import { isStudentLoggedIn } from './lib/studentSession.js';
import { renderStudentLoginPage } from './pages/student/StudentLoginPage.js';
import { renderStudentDashboardPage } from './pages/student/StudentDashboardPage.js';
import { renderStudentEntryPage } from './pages/student/StudentEntryPage.js';
import { renderTestPage } from './pages/TestPage.js';
import { renderSubmitSuccessPage } from './pages/student/SubmitSuccessPage.js';
import { renderAdminLoginPage } from './pages/admin/AdminLoginPage.js';
import { renderAdminDashboardPage } from './pages/admin/AdminDashboardPage.js';
import { renderAdminExamListPage } from './pages/admin/ExamListPage.js';
import { renderExamEditorPage } from './pages/admin/ExamEditorPage.js';
import { renderSubmissionsPage } from './pages/admin/SubmissionsPage.js';
import { renderSubmissionDetailPage } from './pages/admin/SubmissionDetailPage.js';
import { renderStudentRosterPage } from './pages/admin/StudentRosterPage.js';
import { boltShell, boltWordmark } from './components/BoltShell.js';

const appContainer = document.getElementById('app');

const STUDENT_PUBLIC_ROUTES = new Set(['studentLogin']);
const STUDENT_PROTECTED_ROUTES = new Set([
  'studentHome',
  'studentDashboard',
  'studentExamEntry',
  'studentExamTake',
  'studentExamDone',
]);

function isStudentProtectedRoute(routeName) {
  return STUDENT_PROTECTED_ROUTES.has(routeName);
}

async function renderApp() {
  if (!appContainer) return;

  const route = matchRoute(window.location.pathname + window.location.search);

  // --- Admin routes (protected except login) ---
  if (route.name.startsWith('admin') && route.name !== 'adminLogin') {
    if (!supabaseConfigured) {
      renderConfigError('Supabase is not configured for the admin portal.');
      return;
    }
    const { session } = await requireAdminSession();
    if (!session) {
      navigate('/admin/login', { replace: true });
      return;
    }
  }

  // --- Student route guards ---
  if (route.name === 'studentHome') {
    navigate(isStudentLoggedIn() ? '/student' : '/student/login', { replace: true });
    return;
  }

  if (isStudentProtectedRoute(route.name) && !isStudentLoggedIn()) {
    navigate('/student/login', { replace: true });
    return;
  }

  if (route.name === 'studentLogin' && isStudentLoggedIn()) {
    navigate('/student', { replace: true });
    return;
  }

  switch (route.name) {
    case 'adminLogin':
      renderAdminLoginPage(appContainer);
      break;

    case 'adminDashboard':
      await renderAdminDashboardPage(appContainer);
      break;

    case 'adminStudents':
      await renderStudentRosterPage(appContainer);
      break;

    case 'adminExams':
      await renderAdminExamListPage(appContainer);
      break;

    case 'adminExamNew':
      await renderExamEditorPage(appContainer, { examId: null });
      break;

    case 'adminExamEdit':
      await renderExamEditorPage(appContainer, { examId: route.params.examId });
      break;

    case 'adminExamSubmissions':
      await renderSubmissionsPage(appContainer, { examId: route.params.examId });
      break;

    case 'adminSubmissionDetail':
      await renderSubmissionDetailPage(appContainer, { submissionId: route.params.submissionId });
      break;

    case 'studentLogin':
      renderStudentLoginPage(appContainer);
      break;

    case 'studentDashboard':
      await renderStudentDashboardPage(appContainer);
      break;

    case 'studentExamEntry':
      await renderStudentEntryPage(appContainer, { examId: route.params.examId });
      break;

    case 'studentExamTake':
      if (state.session.status === 'in_progress' && state.belongsToExam(route.params.examId)) {
        renderTestPage(appContainer, {
          onSubmitExam: () => navigate(examPath(route.params.examId, 'done')),
        });
      } else if (state.session.status === 'submitted' && state.belongsToExam(route.params.examId)) {
        navigate(examPath(route.params.examId, 'done'), { replace: true });
      } else {
        navigate(examPath(route.params.examId), { replace: true });
      }
      break;

    case 'studentExamDone':
      if (state.session.status === 'submitted' && state.belongsToExam(route.params.examId)) {
        renderSubmitSuccessPage(appContainer, { examId: route.params.examId });
      } else {
        navigate(examPath(route.params.examId), { replace: true });
      }
      break;

    case 'notFound':
    default:
      renderNotFound();
      break;
  }
}

function renderNotFound() {
  appContainer.innerHTML = boltShell({
    width: 'max-w-md',
    header: `<header class="border-b border-bolt-border px-6 py-4">${boltWordmark()}</header>`,
    body: `
      <div class="px-6 py-8 text-center">
        <h1 class="font-display text-xl font-bold text-bolt-ink">Page not found</h1>
        <p class="pt-2 text-sm text-bolt-caption">
          <a href="/student" class="text-bolt-link hover:underline">Student portal</a>
          &middot;
          <a href="/admin" class="text-bolt-link hover:underline">Admin</a>
        </p>
      </div>
    `,
  });
}

function renderConfigError(message) {
  appContainer.innerHTML = boltShell({
    width: 'max-w-md',
    body: `<div class="px-6 py-8 text-sm text-bolt-red">${message}</div>`,
  });
}

window.addEventListener('popstate', () => renderApp());
renderApp();
