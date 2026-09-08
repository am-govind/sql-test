/**
 * Admin global student roster.
 */

import { adminFetch } from '../../lib/supabase.js';
import { navigate } from '../../router.js';
import { sound } from '../../services/sound.js';
import { adminShell, wireAdminShell, escapeHtml } from './adminShell.js';

export async function renderStudentRosterPage(container) {
  container.innerHTML = adminShell({
    title: 'Student roster',
    width: 'max-w-5xl',
    body: `
      <div class="space-y-6 px-6 py-6">
        <section class="rounded-[0.25em] border border-bolt-border p-4">
          <h2 class="font-display text-base text-bolt-slate">Add student</h2>
          <form id="add-student-form" class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="block sm:col-span-2">
              <span class="text-xs font-bold uppercase text-bolt-muted">Full name *</span>
              <input id="input-name" required class="mt-1 w-full px-3 py-2 text-sm" />
            </label>
            <label class="block">
              <span class="text-xs font-bold uppercase text-bolt-muted">Roll number *</span>
              <input id="input-roll" required class="mt-1 w-full px-3 py-2 font-mono text-sm" />
            </label>
            <label class="block">
              <span class="text-xs font-bold uppercase text-bolt-muted">Email (optional)</span>
              <input id="input-email" type="email" class="mt-1 w-full px-3 py-2 text-sm" />
            </label>
            <label class="block sm:col-span-2">
              <span class="text-xs font-bold uppercase text-bolt-muted">Date of birth *</span>
              <input id="input-dob" type="date" required class="mt-1 w-full px-3 py-2 text-sm" />
              <span class="pt-1 text-xs text-bolt-caption">Used as the student's login password. Not shown again after saving.</span>
            </label>
            <div class="sm:col-span-2">
              <p id="form-error" class="hidden text-sm text-bolt-red"></p>
              <button type="submit" class="btn-primary text-sm">Add student</button>
            </div>
          </form>
        </section>

        <section>
          <h2 class="font-display pb-2 text-base text-bolt-slate">All students</h2>
          <div id="roster-body"><p class="text-sm text-bolt-muted">Loading…</p></div>
        </section>
      </div>
    `,
  });

  wireAdminShell(container);
  const rosterBody = container.querySelector('#roster-body');
  const formError = container.querySelector('#form-error');

  async function loadRoster() {
    try {
      const { students } = await adminFetch('/api/admin/students');
      rosterBody.innerHTML = `
        <div class="overflow-x-auto">
          <table class="bolt-table">
            <thead><tr><th>Name</th><th>Roll</th><th>Email</th><th>Added</th><th></th></tr></thead>
            <tbody>
              ${students.map((s) => `
                <tr>
                  <td class="font-bold text-bolt-ink">${escapeHtml(s.fullName)}</td>
                  <td class="font-mono text-xs">${escapeHtml(s.rollNumber)}</td>
                  <td class="text-xs">${escapeHtml(s.email || '—')}</td>
                  <td class="font-mono text-xs">${new Date(s.createdAt).toLocaleDateString()}</td>
                  <td><button type="button" class="text-xs text-bolt-red hover:underline" data-delete="${s.id}">Remove</button></td>
                </tr>
              `).join('') || '<tr><td colspan="5" class="text-bolt-caption">No students yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;

      rosterBody.querySelectorAll('[data-delete]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('Remove this student from the roster?')) return;
          sound.playClick();
          await adminFetch(`/api/admin/students/${btn.dataset.delete}`, { method: 'DELETE' });
          await loadRoster();
        });
      });
    } catch (err) {
      rosterBody.innerHTML = `<p class="text-sm text-bolt-red">${escapeHtml(err.message)}</p>`;
    }
  }

  container.querySelector('#add-student-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    sound.playClick();
    formError.classList.add('hidden');

    try {
      await adminFetch('/api/admin/students', {
        method: 'POST',
        body: JSON.stringify({
          fullName: container.querySelector('#input-name').value.trim(),
          rollNumber: container.querySelector('#input-roll').value.trim(),
          email: container.querySelector('#input-email').value.trim(),
          dob: container.querySelector('#input-dob').value,
        }),
      });
      container.querySelector('#add-student-form').reset();
      await loadRoster();
    } catch (err) {
      formError.textContent = err.message;
      formError.classList.remove('hidden');
      sound.playWarningAlert();
    }
  });

  await loadRoster();
}
