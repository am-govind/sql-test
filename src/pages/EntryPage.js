/**
 * Exam setup and student onboarding.
 */

import { boltShell, boltWordmark } from '../components/BoltShell.js';
import { icons } from '../components/Icons.js';
import { LESSONS, TEST_PRESETS } from '../data/lessons.js';
import { state } from '../services/state.js';
import { sound } from '../services/sound.js';
import { proctor } from '../services/proctor.js';

export function renderEntryPage(container, { onStartExam }) {
  let presetId = 'full';
  let lessonIds = LESSONS.map((lesson) => lesson.id);
  let durationSec = 45 * 60;
  let proctorMode = 'strike_1';
  let fullscreenEnforced = true;

  const history = state.getHistory();

  container.innerHTML = boltShell({
    width: 'max-w-4xl',
    header: `
      <header class="flex items-center justify-between border-b border-bolt-border px-6 py-4">
        ${boltWordmark()}
        ${history.length > 0
          ? `<button id="btn-view-history" class="text-sm text-bolt-link hover:underline">Past submissions (${history.length})</button>`
          : ''}
      </header>
    `,
    body: `
      <div class="space-y-6 px-6 py-6">
        <div>
          <h1 class="font-display text-[1.6em] font-bold text-bolt-ink">Proctored SQL exam</h1>
          <p class="pt-1 text-sm text-bolt-caption">
            You will work through the SQLBolt exercises inside this window. Progress is detected automatically as you solve each task.
          </p>
        </div>

        <section class="space-y-3">
          <h2 class="font-display text-base text-bolt-slate">Your details</h2>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="text-xs font-bold uppercase tracking-wide text-bolt-muted">Full name *</span>
              <input id="input-student-name" type="text" placeholder="Alex Johnson" class="mt-1 w-full px-3 py-2 text-sm" />
            </label>
            <label class="block">
              <span class="text-xs font-bold uppercase tracking-wide text-bolt-muted">Student ID (optional)</span>
              <input id="input-student-id" type="text" placeholder="CS2026-042" class="mt-1 w-full px-3 py-2 font-mono text-sm" />
            </label>
          </div>
        </section>

        <section class="space-y-3">
          <h2 class="font-display text-base text-bolt-slate">Curriculum</h2>
          <div class="space-y-2">
            ${TEST_PRESETS.map((preset) => `
              <label class="preset-option flex cursor-pointer gap-3 rounded-[0.25em] border p-3 transition-colors ${
                preset.id === presetId ? 'border-bolt-blue bg-bolt-callout' : 'border-bolt-border bg-white hover:bg-bolt-menu'
              }" data-preset="${preset.id}">
                <input type="radio" name="preset" value="${preset.id}" class="mt-1 accent-[#2074e7]" ${preset.id === presetId ? 'checked' : ''} />
                <span class="flex-1">
                  <span class="flex items-center justify-between">
                    <span class="text-sm font-bold text-bolt-ink">${preset.name}</span>
                    <span class="font-mono text-xs text-bolt-caption">${preset.lessonIds.length} lessons</span>
                  </span>
                  <span class="block pt-0.5 text-xs text-bolt-caption">${preset.description}</span>
                </span>
              </label>
            `).join('')}
          </div>
        </section>

        <section class="space-y-3">
          <h2 class="font-display text-base text-bolt-slate">Proctoring</h2>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="text-xs font-bold uppercase tracking-wide text-bolt-muted">Time limit</span>
              <select id="select-duration" class="mt-1 w-full px-3 py-2 text-sm">
                <option value="900">15 minutes</option>
                <option value="1800">30 minutes</option>
                <option value="2700" selected>45 minutes</option>
                <option value="3600">60 minutes</option>
                <option value="5400">90 minutes</option>
              </select>
            </label>
            <label class="block">
              <span class="text-xs font-bold uppercase tracking-wide text-bolt-muted">Tab-switch policy</span>
              <select id="select-proctor-mode" class="mt-1 w-full px-3 py-2 text-sm">
                <option value="strike_1" selected>1 Warning (Warning on 1st offense, auto-submit on 2nd)</option>
                <option value="strict">Strict: submit immediately on 1st offense</option>
              </select>
            </label>
          </div>

          <label class="flex cursor-pointer items-center gap-2.5 rounded-[0.25em] bg-bolt-callout p-3">
            <input id="check-fullscreen" type="checkbox" checked class="accent-[#2074e7]" />
            <span class="text-xs text-bolt-slate"><strong>Launch in fullscreen.</strong> Exiting fullscreen is recorded.</span>
          </label>

          <ul class="space-y-1.5 text-xs text-bolt-caption">
            <li>1st tab-switch or focus loss shows a warning modal; 2nd offense automatically submits the exam and emails the report.</li>
            <li>Each lesson unlocks the next once every task passes.</li>
            <li>A full report with per-lesson timings and the proctor log is produced on submission.</li>
          </ul>
        </section>

        <div class="border-t border-bolt-border pt-4">
          <button id="btn-start-exam" class="btn-primary w-full py-3 text-sm uppercase tracking-wide">
            ${icons.play('w-4 h-4')}
            <span>Start proctored exam</span>
          </button>
          <p class="pt-2 text-center text-xs text-bolt-caption">
            Starting confirms you agree to academic honesty and proctor monitoring.
          </p>
        </div>
      </div>

      <div id="history-modal"></div>
    `,
  });

  container.querySelectorAll('input[name="preset"]').forEach((radio) => {
    radio.addEventListener('change', (event) => {
      sound.playClick();
      presetId = event.target.value;
      const preset = TEST_PRESETS.find((item) => item.id === presetId);
      if (preset) {
        lessonIds = preset.lessonIds;
        durationSec = preset.defaultDuration;
        container.querySelector('#select-duration').value = String(durationSec);
      }

      container.querySelectorAll('.preset-option').forEach((option) => {
        const active = option.dataset.preset === presetId;
        option.className = `preset-option flex cursor-pointer gap-3 rounded-[0.25em] border p-3 transition-colors ${
          active ? 'border-bolt-blue bg-bolt-callout' : 'border-bolt-border bg-white hover:bg-bolt-menu'
        }`;
      });
    });
  });

  container.querySelector('#select-duration').addEventListener('change', (event) => {
    durationSec = Number(event.target.value);
  });
  container.querySelector('#select-proctor-mode').addEventListener('change', (event) => {
    proctorMode = event.target.value;
  });
  container.querySelector('#check-fullscreen').addEventListener('change', (event) => {
    fullscreenEnforced = event.target.checked;
  });

  container.querySelector('#btn-view-history')?.addEventListener('click', () => {
    sound.playClick();
    showHistory(container.querySelector('#history-modal'), history);
  });

  const nameInput = container.querySelector('#input-student-name');

  container.querySelector('#btn-start-exam').addEventListener('click', async () => {
    const studentName = nameInput.value.trim();
    if (!studentName) {
      nameInput.focus();
      nameInput.style.borderColor = '#e74c3c';
      sound.playWarningAlert();
      return;
    }

    sound.playClick();
    if (fullscreenEnforced) await proctor.enterFullscreen();

    state.startTest({
      studentName,
      studentId: container.querySelector('#input-student-id').value.trim(),
      presetId,
      selectedLessonIds: lessonIds,
      durationSec,
      proctorMode,
      fullscreenEnforced,
    });

    onStartExam?.();
  });
}

function showHistory(mount, history) {
  mount.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div class="bolt-card w-full max-w-xl p-5">
        <div class="flex items-center justify-between border-b border-bolt-border pb-2">
          <h2 class="font-display text-lg font-bold text-bolt-ink">Past submissions</h2>
          <button id="btn-close-history" class="text-sm text-bolt-link hover:underline">Close</button>
        </div>
        <div class="max-h-96 space-y-2 overflow-y-auto pt-3">
          ${history.map((item) => `
            <div class="flex items-center justify-between rounded-[0.25em] bg-bolt-callout p-3 text-sm">
              <div>
                <div class="font-bold text-bolt-ink">${escapeHtml(item.studentName)}</div>
                <div class="text-xs text-bolt-caption">
                  ${new Date(item.submittedAt).toLocaleString()} &middot; ${item.completedCount}/${item.totalCount} solved
                </div>
              </div>
              <div class="text-right">
                <div class="font-mono font-bold ${item.percentage >= 70 ? 'text-bolt-green' : 'text-bolt-red'}">${item.percentage}%</div>
                <div class="text-[11px] text-bolt-caption">
                  ${item.reason === 'tab_switch_autosubmit' ? 'Auto-submitted' : 'Manual'}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  mount.querySelector('#btn-close-history').addEventListener('click', () => {
    mount.innerHTML = '';
  });
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
