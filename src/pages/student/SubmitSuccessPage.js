/**
 * Student submit confirmation — no scores shown.
 */

import { boltShell, boltWordmark } from '../../components/BoltShell.js';
import { icons } from '../../components/Icons.js';
import { state } from '../../services/state.js';
import { escapeHtml } from '../admin/adminShell.js';

export function renderSubmitSuccessPage(container, { examId }) {
  const session = state.session;
  const saved = session.submissionSaved;
  const error = session.submissionError;

  container.innerHTML = boltShell({
    width: 'max-w-2xl',
    header: `
      <header class="border-b border-bolt-border px-6 py-4">
        ${boltWordmark('Exam submitted')}
      </header>
    `,
    body: `
      <div class="space-y-6 px-6 py-8 text-center">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full ${saved ? 'bg-bolt-callout text-bolt-green' : 'bg-bolt-callout text-bolt-red'}">
          ${saved ? icons.checkCircle('w-8 h-8') : icons.alertTriangle('w-8 h-8')}
        </div>

        <div>
          <h1 class="font-display text-[1.6em] font-bold text-bolt-ink">
            ${saved ? 'Submission received' : 'Submission could not be saved'}
          </h1>
          <p class="pt-2 text-sm text-bolt-caption">
            ${saved
              ? 'Your exam has been submitted successfully. Your instructor will review your results.'
              : escapeHtml(error || 'Please contact your instructor with your name and roll number.')}
          </p>
        </div>

        <div class="rounded-[0.25em] bg-bolt-callout p-4 text-left text-sm">
          <dl class="space-y-2">
            <div class="flex justify-between gap-4">
              <dt class="text-bolt-muted">Name</dt>
              <dd class="font-bold text-bolt-ink">${escapeHtml(session.studentName)}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-bolt-muted">Roll number</dt>
              <dd class="font-mono font-bold text-bolt-ink">${escapeHtml(session.rollNumber)}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-bolt-muted">Exam</dt>
              <dd class="text-bolt-ink">${escapeHtml(session.examTitle || examId)}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-bolt-muted">Submitted at</dt>
              <dd class="font-mono text-xs text-bolt-slate">${new Date(session.submittedAt || Date.now()).toLocaleString()}</dd>
            </div>
          </dl>
        </div>

        <p class="text-xs text-bolt-caption">
          You may close this window. Scores and detailed reports are visible to your instructor only.
        </p>
      </div>
    `,
  });
}
