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
    const { submissions } = await adminFetch(`/api/admin/submissions?examId=${examId}`);

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
              <th>Lessons</th><th>Time</th><th>Violations</th><th>Submitted</th>
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
              </tr>
            `).join('') || '<tr><td colspan="9" class="text-bolt-caption">No submissions yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    bodyEl.querySelector('#btn-back-exams')?.addEventListener('click', () => navigate('/admin/exams'));
    bodyEl.querySelectorAll('tr[data-id]').forEach((row) => {
      row.addEventListener('click', () => navigate(`/admin/submissions/${row.dataset.id}`));
    });
  } catch (err) {
    bodyEl.innerHTML = `<p class="text-sm text-bolt-red">${escapeHtml(err.message)}</p>`;
  }
}
