/**
 * Student home — lists active exams.
 */

import { boltShell, boltWordmark } from '../../components/BoltShell.js';
import { fetchActiveExams } from '../../lib/api.js';
import { navigate } from '../../router.js';
import { escapeHtml } from '../admin/adminShell.js';

function getExamText(description) {
  if (!description) return '';
  try {
    if (description.startsWith('{') && description.endsWith('}')) {
      const parsed = JSON.parse(description);
      return parsed.text || '';
    }
  } catch (_) {}
  return description;
}

export async function renderExamListPage(container) {
  container.innerHTML = boltShell({
    width: 'max-w-3xl',
    header: `
      <header class="flex items-center justify-between border-b border-bolt-border px-6 py-4">
        ${boltWordmark('Proctored SQL exams')}
        <a href="/admin/login" class="text-sm text-bolt-link hover:underline">Admin</a>
      </header>
    `,
    body: `
      <div class="space-y-4 px-6 py-6">
        <h1 class="font-display text-[1.6em] font-bold text-bolt-ink">Available exams</h1>
        <p class="text-sm text-bolt-caption">Select an exam to enter your name and roll number.</p>
        <div id="exam-list" class="space-y-3">
          <p class="text-sm text-bolt-muted">Loading exams…</p>
        </div>
      </div>
    `,
  });

  const listEl = container.querySelector('#exam-list');

  try {
    const exams = await fetchActiveExams();

    if (!exams.length) {
      listEl.innerHTML = `
        <p class="rounded-[0.25em] bg-bolt-callout p-4 text-sm text-bolt-slate">
          No active exams right now. Check back later or ask your instructor for a direct exam link.
        </p>
      `;
      return;
    }

    listEl.innerHTML = exams.map((exam) => `
      <button type="button" class="exam-card w-full rounded-[0.25em] border border-bolt-border bg-white p-4 text-left transition-colors hover:border-bolt-blue hover:bg-bolt-menu" data-exam-id="${exam.id}">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="font-display text-base font-bold text-bolt-ink">${escapeHtml(exam.title)}</h2>
            <p class="pt-1 text-xs text-bolt-caption">${escapeHtml(getExamText(exam.description) || 'SQLBolt proctored exam')}</p>
          </div>
          <span class="shrink-0 font-mono text-xs text-bolt-muted">${exam.lessonCount} lessons</span>
        </div>
        <p class="pt-2 text-xs text-bolt-slate">Time limit: ${Math.round(exam.durationSec / 60)} minutes</p>
      </button>
    `).join('');

    listEl.querySelectorAll('.exam-card').forEach((card) => {
      card.addEventListener('click', () => {
        navigate(`/exam/${card.dataset.examId}`);
      });
    });
  } catch (err) {
    listEl.innerHTML = `
      <p class="rounded-[0.25em] border border-bolt-red bg-bolt-callout p-4 text-sm text-bolt-red">
        Could not load exams: ${escapeHtml(err.message)}
      </p>
    `;
  }
}
