/**
 * Admin sign-in via Supabase Auth.
 */

import { boltShell, boltWordmark } from '../../components/BoltShell.js';
import { supabase, supabaseConfigured, requireAdminSession } from '../../lib/supabase.js';
import { navigate } from '../../router.js';
import { sound } from '../../services/sound.js';
import { escapeHtml } from './adminShell.js';

export async function renderAdminLoginPage(container) {
  if (supabaseConfigured) {
    const { session } = await requireAdminSession();
    if (session) {
      navigate('/admin', { replace: true });
      return;
    }
  }

  container.innerHTML = boltShell({
    width: 'max-w-md',
    header: `
      <header class="border-b border-bolt-border px-6 py-4">
        ${boltWordmark('Admin sign in')}
      </header>
    `,
    body: `
      <div class="space-y-4 px-6 py-6">
        ${!supabaseConfigured ? `
          <p class="rounded-[0.25em] bg-bolt-callout p-3 text-sm text-bolt-red">
            Supabase is not configured. Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your environment.
          </p>
        ` : ''}
        <form id="admin-login-form" class="space-y-3">
          <label class="block">
            <span class="text-xs font-bold uppercase tracking-wide text-bolt-muted">Email</span>
            <input id="input-email" type="email" required class="mt-1 w-full px-3 py-2 text-sm" autocomplete="username" />
          </label>
          <label class="block">
            <span class="text-xs font-bold uppercase tracking-wide text-bolt-muted">Password</span>
            <input id="input-password" type="password" required class="mt-1 w-full px-3 py-2 text-sm" autocomplete="current-password" />
          </label>
          <p id="login-error" class="hidden text-sm text-bolt-red"></p>
          <button type="submit" class="btn-primary w-full py-2.5 text-sm" ${supabaseConfigured ? '' : 'disabled'}>Sign in</button>
        </form>
        <p class="text-center text-xs text-bolt-caption">
          <a href="/" class="text-bolt-link hover:underline">Back to student portal</a>
        </p>
      </div>
    `,
  });

  container.querySelector('#admin-login-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    sound.playClick();

    const email = container.querySelector('#input-email').value.trim();
    const password = container.querySelector('#input-password').value;
    const errorEl = container.querySelector('#login-error');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      errorEl.textContent = error.message;
      errorEl.classList.remove('hidden');
      sound.playWarningAlert();
      return;
    }

    navigate('/admin', { replace: true });
  });
}
