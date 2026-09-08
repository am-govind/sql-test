/**
 * Student login — roll number or email + date of birth.
 */

import { boltShell, boltWordmark } from '../../components/BoltShell.js';
import { renderDobSelector, initDobPicker } from '../../components/DobPicker.js';
import { studentLogin } from '../../lib/studentSession.js';
import { navigate } from '../../router.js';
import { sound } from '../../services/sound.js';
import { escapeHtml } from '../admin/adminShell.js';

export function renderStudentLoginPage(container) {
  container.innerHTML = boltShell({
    width: 'max-w-md',
    header: `
      <header class="border-b border-bolt-border px-6 py-4">
        ${boltWordmark('Student sign in')}
      </header>
    `,
    body: `
      <div class="space-y-4 px-6 py-6">
        <p class="text-sm text-bolt-caption">
          Sign in with your roll number or email and your date of birth.
          You will only see exams you have been enrolled in.
        </p>
        <form id="student-login-form" class="space-y-3">
          <label class="block">
            <span class="text-xs font-bold uppercase tracking-wide text-bolt-muted">Roll number or email</span>
            <input id="input-identifier" type="text" required class="mt-1 w-full px-3 py-2 text-sm" autocomplete="username" placeholder="e.g. 21CS001 or name@example.com" />
          </label>
          <label class="block">
            <span class="text-xs font-bold uppercase tracking-wide text-bolt-muted">Date of birth (DD / MM / YYYY)</span>
            ${renderDobSelector({ id: 'input-dob', defaultYear: 2004, defaultMonth: 1, defaultDay: 1 })}
          </label>
          <p id="login-error" class="hidden text-sm text-bolt-red"></p>
          <button type="submit" class="btn-primary w-full py-2.5 text-sm">Sign in</button>
        </form>
        <p class="text-center text-xs text-bolt-caption">
          <a href="/admin/login" class="text-bolt-link hover:underline">Admin sign in</a>
        </p>
      </div>
    `,
  });

  initDobPicker(container, 'input-dob');

  const form = container.querySelector('#student-login-form');
  const errorEl = container.querySelector('#login-error');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    sound.playClick();
    errorEl.classList.add('hidden');

    const identifier = container.querySelector('#input-identifier').value.trim();
    const dob = container.querySelector('#input-dob').value;

    try {
      await studentLogin(identifier, dob);
      navigate('/student', { replace: true });
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
      sound.playWarningAlert();
    }
  });
}
