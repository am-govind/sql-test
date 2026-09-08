/**
 * Student dashboard — enrolled exams only.
 */

import { boltShell, boltWordmark } from '../../components/BoltShell.js';
import {
  clearStudentSession,
  fetchEnrolledExams,
  getStudentProfile,
} from '../../lib/studentSession.js';
import { navigate } from '../../router.js';
import { sound } from '../../services/sound.js';
import { escapeHtml } from '../admin/adminShell.js';

export async function renderStudentDashboardPage(container) {
  const profile = getStudentProfile();

  container.innerHTML = boltShell({
    width: 'max-w-3xl',
    header: `
      <header class="flex items-center justify-between border-b border-bolt-border px-6 py-4">
        ${boltWordmark('My exams')}
        <button id="btn-student-signout" type="button" class="text-sm text-bolt-link hover:underline">Sign out</button>
      </header>
    `,
    body: `
      <div class="space-y-4 px-6 py-6">
        <div class="rounded-[0.25em] bg-bolt-callout p-3 text-sm">
          <span class="text-bolt-muted">Signed in as</span>
          <span class="font-bold text-bolt-ink">${escapeHtml(profile?.fullName || 'Student')}</span>
          <span class="font-mono text-xs text-bolt-caption">(${escapeHtml(profile?.rollNumber || '')})</span>
        </div>
        <div id="exam-list" class="space-y-3">
          <p class="text-sm text-bolt-muted">Loading your exams…</p>
        </div>
      </div>
    `,
  });

  container.querySelector('#btn-student-signout')?.addEventListener('click', () => {
    sound.playClick();
    clearStudentSession();
    navigate('/student/login', { replace: true });
  });

  const listEl = container.querySelector('#exam-list');

  try {
    const exams = await fetchEnrolledExams();

    if (!exams.length) {
      listEl.innerHTML = `
        <p class="rounded-[0.25em] bg-bolt-callout p-4 text-sm text-bolt-slate">
          No active exams are assigned to you. Ask your instructor to enroll you.
        </p>
      `;
      return;
    }

    listEl.innerHTML = exams.map((exam) => `
      <div class="rounded-[0.25em] border border-bolt-border bg-white p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="font-display text-base font-bold text-bolt-ink">${escapeHtml(exam.title)}</h2>
            <p class="pt-1 text-xs text-bolt-caption">${escapeHtml(exam.description || '')}</p>
          </div>
          <span class="shrink-0 font-mono text-xs text-bolt-muted">${exam.lessonCount} lessons</span>
        </div>
        <p class="pt-2 text-xs text-bolt-slate">Time limit: ${Math.round(exam.durationSec / 60)} minutes</p>
        <div class="pt-3">
          ${exam.alreadySubmitted
            ? '<span class="text-xs font-bold text-bolt-green">Submitted</span>'
            : `<button type="button" class="btn-primary px-3 py-1.5 text-xs" data-exam-id="${exam.id}">Open exam</button>`}
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('[data-exam-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        navigate(`/exam/${btn.dataset.examId}`);
      });
    });
  } catch (err) {
    listEl.innerHTML = `
      <p class="rounded-[0.25em] border border-bolt-red bg-bolt-callout p-4 text-sm text-bolt-red">
        ${escapeHtml(err.message)}
      </p>
    `;
  }
}
