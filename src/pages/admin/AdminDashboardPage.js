/**
 * Admin analytics dashboard.
 */

import { supabase } from '../../lib/supabase.js';
import { adminFetch } from '../../lib/supabase.js';
import { navigate } from '../../router.js';
import { timer } from '../../services/timer.js';
import { adminShell, wireAdminShell, escapeHtml, formatDuration } from './adminShell.js';

export async function renderAdminDashboardPage(container) {
  const { data: exams } = await supabase
    .from('exams')
    .select('id, title')
    .order('created_at', { ascending: false });

  container.innerHTML = adminShell({
    title: 'Dashboard',
    body: `
      <div class="space-y-6 px-6 py-6">
        <div class="flex flex-wrap items-center gap-3">
          <label class="text-sm text-bolt-slate">
            Filter by exam
            <select id="filter-exam" class="ml-2 px-2 py-1 text-sm">
              <option value="">All exams</option>
              ${(exams || []).map((e) => `<option value="${e.id}">${escapeHtml(e.title)}</option>`).join('')}
            </select>
          </label>
          <button id="btn-new-exam" type="button" class="btn-primary px-3 py-1.5 text-xs">New exam</button>
        </div>
        <div id="dashboard-content"><p class="text-sm text-bolt-muted">Loading analytics…</p></div>
      </div>
    `,
  });

  wireAdminShell(container);
  container.querySelector('#btn-new-exam')?.addEventListener('click', () => navigate('/admin/exams/new'));

  const contentEl = container.querySelector('#dashboard-content');
  const filterEl = container.querySelector('#filter-exam');

  async function load() {
    try {
      const examId = filterEl.value;
      const qs = examId ? `?examId=${examId}` : '';
      const { analytics } = await adminFetch(`/api/admin/analytics${qs}`);
      contentEl.innerHTML = renderAnalytics(analytics);
      wireDashboardLinks(contentEl);
    } catch (err) {
      contentEl.innerHTML = `<p class="text-sm text-bolt-red">${escapeHtml(err.message)}</p>`;
    }
  }

  filterEl.addEventListener('change', load);
  await load();
}

function renderAnalytics(a) {
  const distMax = Math.max(...Object.values(a.scoreDistribution || {}), 1);

  return `
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
      ${metricCard('Submissions', a.totalSubmissions)}
      ${metricCard('Avg score', `${a.avgScore}%`)}
      ${metricCard('Pass rate', `${a.passRate}%`)}
      ${metricCard('Avg time', timer.getFormattedTime(a.avgTimeSec))}
      ${metricCard('Violation rate', `${a.violationRate}%`)}
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <section>
        <h2 class="font-display pb-2 text-base text-bolt-slate">Leaderboard</h2>
        <table class="bolt-table">
          <thead><tr><th>#</th><th>Student</th><th>Roll</th><th>Score</th><th>Time</th></tr></thead>
          <tbody>
            ${(a.leaderboard || []).map((row) => `
              <tr>
                <td class="font-mono">${row.rank}</td>
                <td><button type="button" class="text-bolt-link hover:underline" data-submission="${row.id}">${escapeHtml(row.studentName)}</button></td>
                <td class="font-mono text-xs">${escapeHtml(row.rollNumber)}</td>
                <td class="font-mono font-bold">${row.percentage}%</td>
                <td class="font-mono text-xs">${timer.getFormattedTime(row.totalTimeTakenSec)}</td>
              </tr>
            `).join('') || '<tr><td colspan="5" class="text-bolt-caption">No submissions yet.</td></tr>'}
          </tbody>
        </table>
      </section>

      <section>
        <h2 class="font-display pb-2 text-base text-bolt-slate">Score distribution</h2>
        <div class="space-y-2">
          ${Object.entries(a.scoreDistribution || {}).map(([bucket, count]) => `
            <div class="flex items-center gap-2 text-sm">
              <span class="w-14 font-mono text-xs text-bolt-muted">${bucket}%</span>
              <div class="h-4 flex-1 overflow-hidden rounded bg-bolt-rule">
                <div class="h-full bg-bolt-blue" style="width: ${Math.round((count / distMax) * 100)}%"></div>
              </div>
              <span class="w-6 font-mono text-xs">${count}</span>
            </div>
          `).join('')}
        </div>
      </section>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <section>
        <h2 class="font-display pb-2 text-base text-bolt-slate">Lesson completion heatmap</h2>
        <table class="bolt-table">
          <thead><tr><th>Lesson</th><th>Completion</th></tr></thead>
          <tbody>
            ${(a.lessonHeatmap || []).map((row) => `
              <tr>
                <td class="font-mono">#${row.lessonId}</td>
                <td>
                  <div class="flex items-center gap-2">
                    <div class="h-2 flex-1 overflow-hidden rounded bg-bolt-rule">
                      <div class="h-full bg-bolt-green" style="width: ${row.completionRate}%"></div>
                    </div>
                    <span class="font-mono text-xs">${row.completionRate}% (${row.completed}/${row.total})</span>
                  </div>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="2" class="text-bolt-caption">No data yet.</td></tr>'}
          </tbody>
        </table>
      </section>

      <section>
        <h2 class="font-display pb-2 text-base text-bolt-slate">Violations &amp; recent submissions</h2>
        <div class="mb-4 space-y-1 text-sm">
          ${Object.entries(a.violationSummary || {}).map(([type, count]) => `
            <div class="flex justify-between rounded bg-bolt-callout px-2 py-1">
              <span>${escapeHtml(type)}</span><span class="font-mono">${count}</span>
            </div>
          `).join('') || '<p class="text-bolt-caption">No violations recorded.</p>'}
        </div>
        <ul class="divide-y divide-bolt-rule text-sm">
          ${(a.recentSubmissions || []).map((row) => `
            <li class="flex items-center justify-between py-2">
              <button type="button" class="text-bolt-link hover:underline" data-submission="${row.id}">
                ${escapeHtml(row.studentName)} <span class="font-mono text-xs text-bolt-muted">(${escapeHtml(row.rollNumber)})</span>
              </button>
              <span class="font-mono text-xs">${row.percentage}%</span>
            </li>
          `).join('') || '<li class="text-bolt-caption">No submissions yet.</li>'}
        </ul>
      </section>
    </div>
  `;
}

function metricCard(label, value) {
  return `
    <div class="rounded-[0.25em] bg-bolt-callout p-3 text-center">
      <div class="text-xs uppercase text-bolt-muted">${label}</div>
      <div class="pt-1 font-mono text-xl font-bold text-bolt-ink">${value}</div>
    </div>
  `;
}

function wireDashboardLinks(root) {
  root.querySelectorAll('[data-submission]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(`/admin/submissions/${btn.dataset.submission}`));
  });
}
