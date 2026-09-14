import { renderExamEditorPage } from './ExamEditorPage.js';

// Reuse the existing, tested enrollment controls while presenting them as a
// focused workflow separate from exam configuration.
export async function renderEnrollmentPage(container, { examId }) {
  await renderExamEditorPage(container, { examId, showEnrollment: true });

  const form = container.querySelector('#exam-editor-form');
  const enrollment = container.querySelector('#enrollment-section');
  if (!form || !enrollment) return;

  form.querySelectorAll(':scope > *').forEach((element) => {
    if (element !== enrollment) element.classList.add('hidden');
  });
  enrollment.classList.remove('hidden');
  enrollment.classList.remove('rounded-lg', 'border', 'border-bolt-border', 'bg-white', 'p-4', 'shadow-sm');
  enrollment.classList.add('mt-0', 'rounded-none', 'border-0', 'bg-transparent', 'p-0', 'shadow-none');

  const formBody = container.querySelector('#exam-editor-form');
  formBody?.classList.remove('space-y-6', 'px-6', 'py-6');
  formBody?.classList.add('space-y-5', 'px-6', 'py-6');

  const heading = container.querySelector('h1');
  if (heading) heading.textContent = 'Enrollment';
}
