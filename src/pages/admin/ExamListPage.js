/**
 * Admin exam list and management.
 */

import { supabase } from '../../lib/supabase.js';
import { navigate } from '../../router.js';
import { sound } from '../../services/sound.js';
import { adminShell, wireAdminShell, escapeHtml, formatDuration } from './adminShell.js';

export async function renderAdminExamListPage(container) {
  const { data: exams, error } = await supabase
    .from('exams')
    .select('id, title, status, lesson_ids, duration_sec, created_at')
    .order('created_at', { ascending: false });

  container.innerHTML = adminShell({
    title: 'Exams',
    body: `
      <div class="space-y-4 px-6 py-6">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm text-bolt-caption">Create and manage proctored SQL exams.</p>
          <button id="btn-new-exam" type="button" class="btn-primary px-3 py-1.5 text-xs">New exam</button>
        </div>
        ${error ? `<p class="text-sm text-bolt-red">${escapeHtml(error.message)}</p>` : ''}
        <div class="overflow-x-auto">
          <table class="bolt-table">
            <thead>
              <tr>
                <th>Title</th><th>Status</th><th>Lessons</th><th>Duration</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${(exams || []).map((exam) => `
                <tr>
                  <td class="font-bold text-bolt-ink">${escapeHtml(exam.title)}</td>
                  <td><span class="text-xs font-bold uppercase ${statusTone(exam.status)}">${exam.status}</span></td>
                  <td class="font-mono">${exam.lesson_ids?.length ?? 0}</td>
                  <td class="font-mono">${formatDuration(exam.duration_sec)}</td>
                  <td class="space-x-2 whitespace-nowrap">
                    <button type="button" class="text-xs text-bolt-link hover:underline" data-edit="${exam.id}">Edit</button>
                    <button type="button" class="text-xs text-bolt-link hover:underline" data-scores="${exam.id}">Scores</button>
                    <button type="button" class="text-xs text-bolt-muted hover:underline" data-copy="${exam.id}">Copy link</button>
                  </td>
                </tr>
              `).join('') || '<tr><td colspan="5" class="text-bolt-caption">No exams yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `,
  });

  wireAdminShell(container);

  container.querySelector('#btn-new-exam')?.addEventListener('click', () => {
    sound.playClick();
    navigate('/admin/exams/new');
  });

  container.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(`/admin/exams/${btn.dataset.edit}/edit`));
  });

  container.querySelectorAll('[data-scores]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(`/admin/exams/${btn.dataset.scores}/submissions`));
  });

  container.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const url = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/exam/${btn.dataset.copy}`;
      await navigator.clipboard.writeText(url);
      sound.playClick();
    });
  });
}

function statusTone(status) {
  if (status === 'active') return 'text-bolt-green';
  if (status === 'closed') return 'text-bolt-red';
  return 'text-bolt-muted';
}
