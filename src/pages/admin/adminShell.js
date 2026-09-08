/**
 * Shared admin layout chrome.
 */

import { boltShell, boltWordmark } from '../../components/BoltShell.js';
import { navigate } from '../../router.js';
import { supabase } from '../../lib/supabase.js';
import { sound } from '../../services/sound.js';

export function adminShell({ title, body, width = 'max-w-6xl' }) {
  return boltShell({
    width,
    header: `
      <header class="border-b border-bolt-border px-6 py-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          ${boltWordmark('Admin portal')}
          <nav class="flex flex-wrap items-center gap-3 text-sm">
            <a href="/admin" data-nav class="text-bolt-link hover:underline">Dashboard</a>
            <a href="/admin/exams" data-nav class="text-bolt-link hover:underline">Exams</a>
            <a href="/admin/students" data-nav class="text-bolt-link hover:underline">Students</a>
            <button id="btn-admin-signout" type="button" class="text-bolt-muted hover:text-bolt-red">Sign out</button>
          </nav>
        </div>
        ${title ? `<h1 class="pt-3 font-display text-[1.4em] font-bold text-bolt-ink">${title}</h1>` : ''}
      </header>
    `,
    body,
  });
}

export function wireAdminShell(container) {
  container.querySelectorAll('[data-nav]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      sound.playClick();
      navigate(link.getAttribute('href'));
    });
  });

  container.querySelector('#btn-admin-signout')?.addEventListener('click', async () => {
    sound.playClick();
    await supabase?.auth.signOut();
    navigate('/admin/login', { replace: true });
  });
}

export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
