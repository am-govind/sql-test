/**
 * Admin submission detail — full score report (moved from student ResultsPage).
 */

import { adminFetch } from '../../lib/supabase.js';
import { navigate } from '../../router.js';
import { icons } from '../../components/Icons.js';
import { LESSONS } from '../../data/lessons.js';
import { sound } from '../../services/sound.js';
import { timer } from '../../services/timer.js';
import { adminShell, wireAdminShell, escapeHtml } from './adminShell.js';

export async function renderSubmissionDetailPage(container, { submissionId }) {
  container.innerHTML = adminShell({
    title: 'Submission report',
    width: 'max-w-5xl',
    body: `<div id="detail-body" class="px-6 py-6"><p class="text-sm text-bolt-muted">Loading…</p></div>`,
  });

  wireAdminShell(container);
  const bodyEl = container.querySelector('#detail-body');

  try {
    const { submission } = await adminFetch(`/api/admin/submissions?id=${submissionId}`);
    const analytics = submission.analytics || {};
    const autoSubmitted =
      submission.submissionReason === 'tab_switch_autosubmit'
      || submission.submissionReason === 'strike_limit';
    const scoreColor =
      analytics.percentage >= 70 ? 'text-bolt-green' : analytics.percentage >= 40 ? 'text-[#cb6969]' : 'text-bolt-red';

    const lessonIds = (submission.lessonResults || []).map((l) => l.lessonId);

    bodyEl.innerHTML = `
      <div class="space-y-6">
        <div class="no-print flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <button id="btn-back" type="button" class="btn-secondary px-3 py-1.5 text-xs">Back</button>
            <button id="btn-export-json" type="button" class="btn-secondary px-3 py-1.5 text-xs">
              ${icons.download('w-4 h-4')}<span>Export JSON</span>
            </button>
            <button id="btn-print" type="button" class="btn-secondary px-3 py-1.5 text-xs">
              ${icons.printer('w-4 h-4')}<span>Print</span>
            </button>
          </div>
          <div>
            <button id="btn-delete-submission" type="button" class="btn-secondary px-3 py-1.5 text-xs text-bolt-red hover:bg-bolt-red hover:text-white border-bolt-red/40 hover:border-bolt-red transition-colors flex items-center gap-1.5">
              ${icons.trash('w-3.5 h-3.5')}<span>Delete Submission (Allow retake)</span>
            </button>
          </div>
        </div>

        ${autoSubmitted ? `
          <div class="flex items-start gap-3 rounded-[0.25em] border border-bolt-red bg-bolt-callout p-4">
            ${icons.shieldAlert('w-5 h-5 shrink-0 text-bolt-red')}
            <div>
              <h2 class="text-sm font-bold text-bolt-red">Auto-submitted after a proctor violation</h2>
              <p class="pt-0.5 text-xs text-bolt-slate">Tab switch or focus loss triggered automatic submission.</p>
            </div>
          </div>
        ` : ''}

        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="font-display text-[1.4em] font-bold text-bolt-ink">${escapeHtml(submission.studentName)}</h2>
            <p class="pt-0.5 font-mono text-xs text-bolt-caption">
              ${escapeHtml(submission.rollNumber)} &middot; ${escapeHtml(submission.examTitle)}
              &middot; ${new Date(submission.submittedAt).toLocaleString()}
            </p>
          </div>
          <div class="text-right">
            <div class="font-mono text-4xl font-bold ${scoreColor}">${analytics.percentage ?? 0}%</div>
            <div class="text-xs font-bold uppercase text-bolt-muted">${escapeHtml(analytics.grade?.label || '—')}</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          ${metric('Lessons solved', `${analytics.completedCount ?? 0} / ${analytics.totalCount ?? 0}`)}
          ${metric('Points', `${analytics.earnedPoints ?? 0} / ${analytics.totalPossiblePoints ?? 0}`)}
          ${metric('Time taken', timer.getFormattedTime(analytics.totalTimeTakenSec ?? 0))}
          ${metric('Violations', String(analytics.totalViolations ?? 0), (analytics.totalViolations ?? 0) > 0 ? 'text-bolt-red' : 'text-bolt-green')}
        </div>

        <section>
          <h3 class="font-display pb-2 text-base text-bolt-slate">Lesson breakdown</h3>
          <div class="overflow-x-auto">
            <table class="bolt-table">
              <thead><tr><th>#</th><th>Lesson</th><th>Status</th><th>Time</th><th>Last query</th></tr></thead>
              <tbody>
                ${lessonIds.map((id) => {
                  const lesson = LESSONS.find((l) => l.id === id);
                  const progress = (submission.lessonResults || []).find((l) => l.lessonId === id) || {};
                  return `
                    <tr>
                      <td class="font-mono text-bolt-caption">${id}</td>
                      <td>
                        <div class="font-bold text-bolt-ink">${escapeHtml(lesson?.shortTitle || `Lesson ${id}`)}</div>
                        <div class="text-xs text-bolt-caption">${escapeHtml(lesson?.category?.label || progress.category || '')}</div>
                      </td>
                      <td>${progress.completed ? '<span class="font-bold text-bolt-green">&#10003; Solved</span>' : '<span class="text-bolt-caption">Unsolved</span>'}</td>
                      <td class="font-mono">${timer.getFormattedTime(progress.timeSpentSec || 0)}</td>
                      <td>${progress.sqlQuery ? `<code class="block max-w-xs truncate text-xs text-bolt-link">${escapeHtml(progress.sqlQuery)}</code>` : '<span class="text-bolt-amber">&mdash;</span>'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3 class="font-display pb-2 text-base text-bolt-slate">Proctor audit log</h3>
          ${(submission.violations || []).length ? `
            <ul class="divide-y divide-bolt-rule text-sm">
              ${submission.violations.map((v, i) => `
                <li class="flex items-center justify-between py-2">
                  <span><span class="font-mono text-bolt-red">#${i + 1}</span> ${escapeHtml(v.label)}</span>
                  <span class="font-mono text-xs text-bolt-caption">${escapeHtml(v.timestamp)} (+${timer.getFormattedTime(v.timeElapsedSec || 0)})</span>
                </li>
              `).join('')}
            </ul>
          ` : '<p class="rounded-[0.25em] bg-bolt-callout p-3 text-sm text-bolt-green">Clean record.</p>'}
        </section>
      </div>
    `;

    bodyEl.querySelector('#btn-back')?.addEventListener('click', () => {
      if (submission.examId) navigate(`/admin/exams/${submission.examId}/submissions`);
      else navigate('/admin');
    });
    bodyEl.querySelector('#btn-print')?.addEventListener('click', () => window.print());
    bodyEl.querySelector('#btn-export-json')?.addEventListener('click', () => {
      sound.playClick();
      const blob = new Blob([JSON.stringify(submission, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `submission-${submission.rollNumber}-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    });
    bodyEl.querySelector('#btn-delete-submission')?.addEventListener('click', async () => {
      const studentName = submission.studentName || 'this student';
      const rollNumber = submission.rollNumber ? ` (${submission.rollNumber})` : '';
      if (!confirm(`Are you sure you want to delete the submission for ${studentName}${rollNumber}?\n\nThis will permanently remove their submission record and allow them to reappear and retake the exam.`)) {
        return;
      }
      sound.playClick();
      const deleteBtn = bodyEl.querySelector('#btn-delete-submission');
      if (deleteBtn) {
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Deleting…';
      }
      try {
        await adminFetch(`/api/admin/submissions?id=${submission.id}`, { method: 'DELETE' });
        alert(`Submission deleted successfully.\n${studentName} can now reappear for this exam.`);
        if (submission.examId) {
          navigate(`/admin/exams/${submission.examId}/submissions`);
        } else {
          navigate('/admin/exams');
        }
      } catch (delErr) {
        alert(`Failed to delete submission: ${delErr.message}`);
        if (deleteBtn) {
          deleteBtn.disabled = false;
          deleteBtn.innerHTML = `${icons.trash('w-3.5 h-3.5')}<span>Delete Submission (Allow retake)</span>`;
        }
      }
    });

  } catch (err) {
    bodyEl.innerHTML = `<p class="text-sm text-bolt-red">${escapeHtml(err.message)}</p>`;
  }
}

function metric(label, value, tone = 'text-bolt-ink') {
  return `
    <div class="rounded-[0.25em] bg-bolt-callout p-3 text-center">
      <div class="text-xs uppercase tracking-wide text-bolt-muted">${label}</div>
      <div class="pt-1 font-mono text-xl font-bold ${tone}">${value}</div>
    </div>
  `;
}
