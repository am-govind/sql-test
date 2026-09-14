import { renderExamEditorPage } from './ExamEditorPage.js';

// Reuse the existing, tested enrollment controls while presenting them as a
// focused workflow separate from exam configuration.
export async function renderEnrollmentPage(container, { examId }) {
  await renderExamEditorPage(container, { examId });

  const form = container.querySelector('#exam-editor-form');
  const enrollment = container.querySelector('#enrollment-section');
  if (!form || !enrollment) return;

  form.querySelectorAll(':scope > *').forEach((element) => {
    if (element !== enrollment) element.classList.add('hidden');
  });
  enrollment.classList.remove('hidden');
  enrollment.classList.add('mt-2');

  const heading = container.querySelector('h1');
  if (heading) heading.textContent = 'Manage enrollment';
}
