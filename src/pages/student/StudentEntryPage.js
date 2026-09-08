/**
 * Student exam entry — identity from login session.
 */

import { boltShell, boltWordmark } from '../../components/BoltShell.js';
import { icons } from '../../components/Icons.js';
import { fetchEnrolledExam, getStudentProfile } from '../../lib/studentSession.js';
import { navigate, examPath } from '../../router.js';
import { state } from '../../services/state.js';
import { sound } from '../../services/sound.js';
import { proctor } from '../../services/proctor.js';
import { escapeHtml } from '../admin/adminShell.js';

export async function renderStudentEntryPage(container, { examId }) {
  const profile = getStudentProfile();

  container.innerHTML = boltShell({
    width: 'max-w-3xl',
    header: `
      <header class="flex items-center justify-between border-b border-bolt-border px-6 py-4">
        ${boltWordmark('Proctored SQL exam')}
        <a href="/student" class="text-sm text-bolt-link hover:underline">My exams</a>
      </header>
    `,
    body: `<div id="entry-body" class="px-6 py-6"><p class="text-sm text-bolt-muted">Loading exam…</p></div>`,
  });

  const bodyEl = container.querySelector('#entry-body');

  try {
    const { exam, alreadySubmitted } = await fetchEnrolledExam(examId);

    if (alreadySubmitted) {
      bodyEl.innerHTML = `
        <div class="space-y-4 text-center">
          <p class="text-sm text-bolt-green font-bold">You have already submitted this exam.</p>
          <button type="button" id="btn-back" class="btn-secondary text-sm">Back to my exams</button>
        </div>
      `;
      bodyEl.querySelector('#btn-back')?.addEventListener('click', () => navigate('/student'));
      return;
    }

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

        <div class="rounded-[0.25em] bg-bolt-callout p-3 text-sm">
          <div class="text-xs uppercase text-bolt-muted">Signed in as</div>
          <div class="font-bold text-bolt-ink">${escapeHtml(profile?.fullName || '')}</div>
          <div class="font-mono text-xs text-bolt-caption">${escapeHtml(profile?.rollNumber || '')}</div>
        </div>

        <ul class="space-y-1.5 text-xs text-bolt-caption">
          <li>Tab switches are monitored per your instructor's policy.</li>
          <li>Each lesson unlocks the next once every task is solved.</li>
          <li>Scores are visible to your instructor only after submission.</li>
        </ul>

        <div class="border-t border-bolt-border pt-4">
          <button id="btn-start-exam" type="button" class="btn-primary w-full py-3 text-sm uppercase tracking-wide">
            ${icons.play('w-4 h-4')}
            <span>Start exam</span>
          </button>
        </div>
      </div>
    `;

    bodyEl.querySelector('#btn-start-exam').addEventListener('click', async () => {
      sound.playClick();
      if (exam.fullscreenEnforced) await proctor.enterFullscreen();

      state.startTest({
        examId: exam.id,
        examTitle: exam.title,
        studentId: profile.id,
        studentName: profile.fullName,
        rollNumber: profile.rollNumber,
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
        <button type="button" id="btn-back-home" class="btn-secondary text-sm">Back to my exams</button>
      </div>
    `;
    bodyEl.querySelector('#btn-back-home')?.addEventListener('click', () => navigate('/student'));
  }
}
