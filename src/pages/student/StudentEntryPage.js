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

    function permTile(id, perm, iconHtml, label) {
      return `
        <button type="button" id="${id}"
          class="perm-tile flex items-center gap-2 p-2 bg-white rounded border border-blue-100 text-bolt-slate hover:border-bolt-blue hover:shadow-sm transition-all text-left w-full text-xs"
          data-perm="${perm}" data-status="idle">
          <span class="text-bolt-blue shrink-0">${iconHtml}</span>
          <span class="flex-1">${label}</span>
          <span class="perm-badge shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">Click</span>
        </button>`;
    }

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

        ${hasMediaRequirements ? `
          <div class="rounded-lg border border-blue-200 bg-blue-50/60 p-4 space-y-3">
            <span class="text-bolt-blue font-bold text-sm">Hardware &amp; Proctor Verification</span>
            <p class="text-xs text-bolt-slate pt-1">
              Click each tile below to grant the required permissions before starting.
            </p>
            <div class="grid gap-2 sm:grid-cols-3 pt-1">
              ${proctorConfig.webcam    ? permTile('perm-webcam', 'webcam', icons.camera('w-4 h-4'),  'Webcam feed') : ''}
              ${proctorConfig.mic       ? permTile('perm-mic',    'mic',    icons.mic('w-4 h-4'),     'Microphone')  : ''}
              ${proctorConfig.screenshare ? permTile('perm-screen', 'screen', icons.monitor('w-4 h-4'), 'Screen share') : ''}
            </div>
            <p id="perm-hint" class="text-[11px] text-bolt-muted">
              All permissions must be granted to start the exam.
            </p>
          </div>
        ` : ''}

        <ul class="space-y-1.5 text-xs text-bolt-caption">
          <li>Tab switching, window defocusing, and minimize events are recorded.</li>
          <li>Each lesson unlocks the next once every task is solved.</li>
          <li>Scores and proctor audit logs are visible to your instructor after submission.</li>
        </ul>

        <div id="permission-error" class="hidden rounded p-3 text-xs text-bolt-red bg-red-50 border border-red-200"></div>

        <div class="border-t border-bolt-border pt-4">
          <button id="btn-start-exam" type="button" class="btn-primary w-full py-3 text-sm uppercase tracking-wide" ${hasMediaRequirements ? 'disabled' : ''}>
            ${icons.play('w-4 h-4')}
            <span id="btn-start-label">${hasMediaRequirements ? 'Grant permissions above to continue' : 'Start proctored exam'}</span>
          </button>
        </div>
      </div>
    `;

    const startBtn   = bodyEl.querySelector('#btn-start-exam');
    const startLabel = bodyEl.querySelector('#btn-start-label');
    const errorEl    = bodyEl.querySelector('#permission-error');

    // ── Per-tile permission granting ──────────────────────────────────────
    const permStreams = {};

    function setTileStatus(tile, status) {
      tile.dataset.status = status;
      const badge = tile.querySelector('.perm-badge');
      if (status === 'requesting') {
        tile.disabled = true;
        badge.textContent = '…';
        badge.className = 'perm-badge shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-600';
      } else if (status === 'granted') {
        tile.disabled = true;
        badge.textContent = '✓';
        badge.className = 'perm-badge shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-600';
        tile.classList.add('border-green-300', 'bg-green-50');
        tile.classList.remove('border-blue-100', 'bg-white');
      } else if (status === 'denied') {
        tile.disabled = false;
        badge.textContent = '✗ Retry';
        badge.className = 'perm-badge shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600';
        tile.classList.remove('border-green-300', 'bg-green-50');
        tile.classList.add('border-red-300');
      }
    }

    function checkAllGranted() {
      const tiles = [...bodyEl.querySelectorAll('.perm-tile')];
      const allGranted = tiles.length > 0 && tiles.every((t) => t.dataset.status === 'granted');
      startBtn.disabled = !allGranted;
      startLabel.textContent = allGranted
        ? 'Start proctored exam'
        : 'Grant permissions above to continue';
      const hint = bodyEl.querySelector('#perm-hint');
      if (hint) hint.textContent = allGranted
        ? 'All permissions granted — you can start the exam.'
        : 'All permissions must be granted to start the exam.';
    }

    bodyEl.querySelectorAll('.perm-tile').forEach((tile) => {
      tile.addEventListener('click', async () => {
        const perm = tile.dataset.perm;
        setTileStatus(tile, 'requesting');
        errorEl.classList.add('hidden');
        try {
          if (perm === 'webcam') {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            permStreams.webcam = stream;
          } else if (perm === 'mic') {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            permStreams.mic = stream;
          } else if (perm === 'screen') {
            // getDisplayMedia MUST be triggered from a direct user gesture — this click satisfies that
            const stream = await navigator.mediaDevices.getDisplayMedia({
              video: { cursor: 'always' },
              audio: false,
            });
            permStreams.screen = stream;
            // If user stops sharing before exam starts, revert tile to denied
            stream.getVideoTracks()[0].addEventListener('ended', () => {
              delete permStreams.screen;
              setTileStatus(tile, 'denied');
              startBtn.disabled = true;
              startLabel.textContent = 'Grant permissions above to continue';
              errorEl.textContent = 'Screen sharing was stopped. Click the tile to share again before starting.';
              errorEl.classList.remove('hidden');
            });
          }
          setTileStatus(tile, 'granted');
          checkAllGranted();
        } catch (err) {
          setTileStatus(tile, 'denied');
          errorEl.textContent = `Permission denied: ${err.message}. Click the tile to try again.`;
          errorEl.classList.remove('hidden');
        }
      });
    });

    // ── Start exam ─────────────────────────────────────────────────────────
    startBtn.addEventListener('click', async () => {
      sound.playClick();
      errorEl.classList.add('hidden');
      startBtn.disabled = true;
      startLabel.textContent = 'Starting exam…';

      try {
        if (hasMediaRequirements) {
          if (typeof mediaProctor.setAcquiredStreams === 'function') {
            mediaProctor.setAcquiredStreams(permStreams);
          }
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
