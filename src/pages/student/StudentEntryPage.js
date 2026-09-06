/**
 * Student exam entry — name and roll number only.
 */

import { boltShell, boltWordmark } from '../../components/BoltShell.js';
import { icons } from '../../components/Icons.js';
import { fetchExam } from '../../lib/api.js';
import { navigate, examPath } from '../../router.js';
import { state } from '../../services/state.js';
import { sound } from '../../services/sound.js';
import { proctor } from '../../services/proctor.js';
import { escapeHtml } from '../admin/adminShell.js';

export async function renderStudentEntryPage(container, { examId }) {
  container.innerHTML = boltShell({
    width: 'max-w-3xl',
    header: `
      <header class="border-b border-bolt-border px-6 py-4">
        ${boltWordmark('Proctored SQL exam')}
      </header>
    `,
    body: `<div id="entry-body" class="px-6 py-6"><p class="text-sm text-bolt-muted">Loading exam…</p></div>`,
  });

  const bodyEl = container.querySelector('#entry-body');

  try {
    const exam = await fetchExam(examId);

    bodyEl.innerHTML = `
      <div class="space-y-6">
        <div>
          <h1 class="font-display text-[1.6em] font-bold text-bolt-ink">${escapeHtml(exam.title)}</h1>
          <p class="pt-1 text-sm text-bolt-caption">${escapeHtml(exam.description || 'Complete the SQLBolt exercises in this window.')}</p>
        </div>

        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="rounded-[0.25em] bg-bolt-callout p-3">
            <div class="text-xs uppercase text-bolt-muted">Lessons</div>
            <div class="font-mono font-bold text-bolt-ink">${exam.lessonIds.length}</div>
          </div>
          <div class="rounded-[0.25em] bg-bolt-callout p-3">
            <div class="text-xs uppercase text-bolt-muted">Time limit</div>
            <div class="font-mono font-bold text-bolt-ink">${Math.round(exam.durationSec / 60)} min</div>
          </div>
        </div>

        <section class="space-y-3">
          <h2 class="font-display text-base text-bolt-slate">Your details</h2>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="text-xs font-bold uppercase tracking-wide text-bolt-muted">Full name *</span>
              <input id="input-student-name" type="text" class="mt-1 w-full px-3 py-2 text-sm" placeholder="Alex Johnson" />
            </label>
            <label class="block">
              <span class="text-xs font-bold uppercase tracking-wide text-bolt-muted">Roll number *</span>
              <input id="input-roll-number" type="text" class="mt-1 w-full px-3 py-2 font-mono text-sm" placeholder="CS2026-042" />
            </label>
          </div>
        </section>

        <ul class="space-y-1.5 text-xs text-bolt-caption">
          <li>Tab switches are monitored. Your instructor sets the policy for this exam.</li>
          <li>Each lesson unlocks the next once every task is solved.</li>
          <li>You will see a confirmation screen after submission — scores are available to your instructor only.</li>
        </ul>

        <div class="border-t border-bolt-border pt-4">
          <button id="btn-start-exam" type="button" class="btn-primary w-full py-3 text-sm uppercase tracking-wide">
            ${icons.play('w-4 h-4')}
            <span>Start exam</span>
          </button>
        </div>
      </div>
    `;

    const nameInput = bodyEl.querySelector('#input-student-name');
    const rollInput = bodyEl.querySelector('#input-roll-number');

    bodyEl.querySelector('#btn-start-exam').addEventListener('click', async () => {
      const studentName = nameInput.value.trim();
      const rollNumber = rollInput.value.trim();

      if (!studentName) {
        nameInput.style.borderColor = '#e74c3c';
        sound.playWarningAlert();
        return;
      }
      if (!rollNumber) {
        rollInput.style.borderColor = '#e74c3c';
        sound.playWarningAlert();
        return;
      }

      sound.playClick();
      if (exam.fullscreenEnforced) await proctor.enterFullscreen();

      state.startTest({
        examId: exam.id,
        examTitle: exam.title,
        studentName,
        rollNumber,
        selectedLessonIds: exam.lessonIds,
        durationSec: exam.durationSec,
        proctorMode: exam.proctorMode,
        fullscreenEnforced: exam.fullscreenEnforced,
      });

      navigate(examPath(examId, 'take'));
    });
  } catch (err) {
    bodyEl.innerHTML = `
      <div class="space-y-3">
        <p class="text-sm text-bolt-red">This exam is not available: ${escapeHtml(err.message)}</p>
        <button type="button" id="btn-back-home" class="btn-secondary text-sm">Back to exams</button>
      </div>
    `;
    bodyEl.querySelector('#btn-back-home')?.addEventListener('click', () => navigate('/'));
  }
}
