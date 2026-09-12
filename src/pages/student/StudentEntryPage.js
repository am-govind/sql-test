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
import { mediaProctor } from '../../services/mediaProctor.js';
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

    // Parse proctorConfig if embedded in description JSON
    let proctorConfig = { webcam: true, mic: true, screenshare: false, blockCopyPaste: true, blockDevtools: true };
    let cleanDescription = exam.description || 'Complete the SQLBolt exercises in this window.';
    try {
      if (exam.description && exam.description.startsWith('{') && exam.description.endsWith('}')) {
        const parsed = JSON.parse(exam.description);
        if (parsed.proctorConfig) {
          proctorConfig = { ...proctorConfig, ...parsed.proctorConfig };
          cleanDescription = parsed.text || '';
        }
      }
    } catch {}

    const hasMediaRequirements = proctorConfig.webcam || proctorConfig.mic || proctorConfig.screenshare;

    bodyEl.innerHTML = `
      <div class="space-y-6">
        <div>
          <h1 class="font-display text-[1.6em] font-bold text-bolt-ink">${escapeHtml(exam.title)}</h1>
          <p class="pt-1 text-sm text-bolt-caption">${escapeHtml(cleanDescription)}</p>
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

        <!-- Security & Hardware Checks -->
        ${hasMediaRequirements ? `
          <div class="rounded-lg border border-blue-200 bg-blue-50/60 p-4 space-y-3">
            <div class="flex items-center gap-2">
              <span class="text-bolt-blue font-bold text-sm">Hardware & Proctor Verification</span>
            </div>
            <p class="text-xs text-bolt-slate">
              This exam enforces proctor monitoring. When you click start, your browser will ask for device permissions:
            </p>
            <div class="grid gap-2 sm:grid-cols-3 text-xs pt-1">
              ${proctorConfig.webcam ? `
                <div class="flex items-center gap-2 p-2 bg-white rounded border border-blue-100 text-bolt-slate">
                  <span class="text-bolt-blue">${icons.camera('w-4 h-4')}</span>
                  <span>Webcam feed</span>
                </div>
              ` : ''}
              ${proctorConfig.mic ? `
                <div class="flex items-center gap-2 p-2 bg-white rounded border border-blue-100 text-bolt-slate">
                  <span class="text-bolt-blue">${icons.mic('w-4 h-4')}</span>
                  <span>Microphone level</span>
                </div>
              ` : ''}
              ${proctorConfig.screenshare ? `
                <div class="flex items-center gap-2 p-2 bg-white rounded border border-blue-100 text-bolt-slate">
                  <span class="text-bolt-blue">${icons.monitor('w-4 h-4')}</span>
                  <span>Screen sharing</span>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        <ul class="space-y-1.5 text-xs text-bolt-caption">
          <li>Tab switching, window defocusing, and minimize events are recorded.</li>
          <li>Each lesson unlocks the next once every task is solved.</li>
          <li>Scores and proctor audit logs are visible to your instructor after submission.</li>
        </ul>

        <div id="permission-error" class="hidden rounded p-3 text-xs text-bolt-red bg-red-50 border border-red-200"></div>

        <div class="border-t border-bolt-border pt-4">
          <button id="btn-start-exam" type="button" class="btn-primary w-full py-3 text-sm uppercase tracking-wide">
            ${icons.play('w-4 h-4')}
            <span id="btn-start-label">Start proctored exam</span>
          </button>
        </div>
      </div>
    `;

    const startBtn = bodyEl.querySelector('#btn-start-exam');
    const startLabel = bodyEl.querySelector('#btn-start-label');
    const errorEl = bodyEl.querySelector('#permission-error');

    startBtn.addEventListener('click', async () => {
      sound.playClick();
      errorEl.classList.add('hidden');
      startBtn.disabled = true;
      startLabel.textContent = 'Verifying permissions…';

      try {
        // Request and verify media streams (webcam, mic, screen)
        if (hasMediaRequirements) {
          await mediaProctor.setupStreams(proctorConfig);
        }

        if (exam.fullscreenEnforced) {
          await proctor.enterFullscreen();
        }

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
          proctorConfig,
        });

        navigate(examPath(examId, 'take'));
      } catch (err) {
        startBtn.disabled = false;
        startLabel.textContent = 'Start proctored exam';
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
        sound.playWarningAlert();
      }
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
