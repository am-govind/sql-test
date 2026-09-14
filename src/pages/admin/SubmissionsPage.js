/**
 * Per-exam submissions list for admins.
 */

import { adminFetch } from '../../lib/supabase.js';
import { navigate } from '../../router.js';
import { timer } from '../../services/timer.js';
import { adminShell, wireAdminShell, escapeHtml } from './adminShell.js';

export async function renderSubmissionsPage(container, { examId }) {
  container.innerHTML = adminShell({
    title: 'Exam submissions',
    body: `<div id="submissions-body" class="px-6 py-6"><p class="text-sm text-bolt-muted">Loading…</p></div>`,
  });

  wireAdminShell(container);
  const bodyEl = container.querySelector('#submissions-body');

  try {
    const [{ submissions }, { events }] = await Promise.all([
      adminFetch(`/api/admin/submissions?examId=${examId}`),
      adminFetch(`/api/admin/proctoring-events?examId=${examId}`),
    ]);

    bodyEl.innerHTML = `
      <div class="mb-4 flex items-center justify-between gap-3">
        <p class="text-sm text-bolt-caption">${submissions.length} submission(s)</p>
        <button type="button" id="btn-back-exams" class="btn-secondary text-xs">Back to exams</button>
      </div>
      <div class="overflow-x-auto">
        <table class="bolt-table">
          <thead>
            <tr>
              <th>#</th><th>Name</th><th>Roll</th><th>Score</th><th>Grade</th>
              <th>Lessons</th><th>Time</th><th>Violations</th><th>Submitted</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${submissions.map((row, index) => `
              <tr class="cursor-pointer hover:bg-bolt-menu" data-id="${row.id}">
                <td class="font-mono">${index + 1}</td>
                <td class="font-bold text-bolt-ink">${escapeHtml(row.studentName)}</td>
                <td class="font-mono text-xs">${escapeHtml(row.rollNumber)}</td>
                <td class="font-mono font-bold ${row.percentage >= 70 ? 'text-bolt-green' : 'text-bolt-red'}">${row.percentage}%</td>
                <td class="text-xs">${escapeHtml(row.grade)}</td>
                <td class="font-mono text-xs">${row.completedCount}/${row.totalCount}</td>
                <td class="font-mono text-xs">${timer.getFormattedTime(row.totalTimeTakenSec)}</td>
                <td class="font-mono text-xs ${row.totalViolations > 0 ? 'text-bolt-red' : ''}">${row.totalViolations}</td>
                <td class="font-mono text-xs">${new Date(row.submittedAt).toLocaleString()}</td>
                <td>
                  <button type="button" class="btn-secondary px-2 py-1 text-xs text-bolt-red hover:bg-bolt-red hover:text-white border-bolt-red/30 transition-colors" data-delete-id="${row.id}" data-student-name="${escapeHtml(row.studentName)}" data-roll-number="${escapeHtml(row.rollNumber)}" title="Delete submission to allow student to retake">
                    Allow Retake
                  </button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="10" class="text-bolt-caption">No submissions yet.</td></tr>'}
          </tbody>
        </table>
      </div>
      <section class="mt-8">
        <div class="mb-3 flex items-center justify-between">
          <div>
            <h2 class="font-display text-base font-semibold text-bolt-slate">Proctoring review</h2>
            <p class="text-xs text-bolt-muted">Review captured evidence before making a decision.</p>
          </div>
          <span class="text-xs text-bolt-muted">${events.length} event${events.length === 1 ? '' : 's'}</span>
        </div>
        <div id="proctoring-events" class="space-y-3">
          ${events.map((event) => `
            <article class="rounded-md border border-bolt-border bg-white p-3" data-event-id="${event.id}">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="flex gap-3">
                  ${event.snapshot_url ? `<a href="${event.snapshot_url}" target="_blank" rel="noreferrer"><img src="${event.snapshot_url}" alt="Proctoring evidence" class="h-20 w-28 rounded border border-bolt-border object-cover" /></a>` : '<div class="flex h-20 w-28 items-center justify-center rounded bg-slate-100 text-[10px] text-bolt-muted">No snapshot</div>'}
                  <div>
                    <p class="font-semibold text-bolt-ink">${escapeHtml(event.studentName)} <span class="font-mono text-xs text-bolt-muted">(${escapeHtml(event.rollNumber)})</span></p>
                    <p class="mt-1 text-xs font-bold uppercase text-bolt-red">${escapeHtml(event.violationType.replaceAll('_', ' '))}</p>
                    <p class="mt-1 text-xs text-bolt-muted">${new Date(event.detectedAt).toLocaleString()} · ${event.confidence == null ? 'No confidence score' : `${Math.round(event.confidence * 100)}% confidence`}</p>
                  </div>
                </div>
                <span class="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-bolt-muted" data-review-status>${escapeHtml(event.reviewStatus.replaceAll('_', ' '))}</span>
              </div>
              <div class="mt-3 flex flex-wrap items-center gap-2 border-t border-bolt-border pt-3">
                <input data-review-notes class="min-w-[220px] flex-1 px-2 py-1 text-xs" placeholder="Optional review notes" value="${escapeHtml(event.reviewNotes || '')}" />
                <button type="button" class="btn-secondary px-2 py-1 text-xs text-bolt-red" data-review="cheating">Mark cheating</button>
                <button type="button" class="btn-secondary px-2 py-1 text-xs text-bolt-green" data-review="not_cheating">Not cheating</button>
                <button type="button" class="btn-secondary px-2 py-1 text-xs" data-review="needs_review">Needs review</button>
              </div>
            </article>
          `).join('') || '<p class="rounded-md border border-dashed border-bolt-border p-6 text-center text-sm text-bolt-muted">No proctoring events for this exam.</p>'}
        </div>
      </section>
    `;

    bodyEl.querySelector('#btn-back-exams')?.addEventListener('click', () => navigate('/admin/exams'));
    bodyEl.querySelectorAll('tr[data-id]').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('[data-delete-id]')) return;
        navigate(`/admin/submissions/${row.dataset.id}`);
      });
    });

    bodyEl.querySelectorAll('[data-delete-id]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const studentName = btn.dataset.studentName || 'this student';
        const rollNumber = btn.dataset.rollNumber ? ` (${btn.dataset.rollNumber})` : '';
        if (!confirm(`Delete submission for ${studentName}${rollNumber}?\n\nThis will allow the student to reappear and retake the exam.`)) {
          return;
        }
        btn.disabled = true;
        btn.textContent = 'Deleting…';
        try {
          await adminFetch(`/api/admin/submissions?id=${btn.dataset.deleteId}`, { method: 'DELETE' });
          alert(`Submission deleted. ${studentName} can now reappear for this exam.`);
          renderSubmissionsPage(container, { examId });
        } catch (err) {
          alert(`Failed to delete: ${err.message}`);
          btn.disabled = false;
          btn.textContent = 'Allow Retake';
        }
      });
    });

    bodyEl.querySelectorAll('[data-event-id] [data-review]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('[data-event-id]');
        const status = btn.dataset.review;
        const buttons = card.querySelectorAll('[data-review]');
        buttons.forEach((item) => { item.disabled = true; });
        try {
          await adminFetch(`/api/admin/proctoring-events?id=${card.dataset.eventId}`, {
            method: 'PATCH',
            body: JSON.stringify({
              reviewStatus: status,
              reviewNotes: card.querySelector('[data-review-notes]').value,
            }),
          });
          card.querySelector('[data-review-status]').textContent = status.replaceAll('_', ' ');
        } catch (err) {
          alert(`Failed to save review: ${err.message}`);
        } finally {
          buttons.forEach((item) => { item.disabled = false; });
        }
      });
    });
  } catch (err) {
    bodyEl.innerHTML = `<p class="text-sm text-bolt-red">${escapeHtml(err.message)}</p>`;
  }
}
