/**
 * Exam header, styled to continue SQLBolt's own header so the embedded lesson
 * reads as part of the same page.
 */

import { icons } from './Icons.js';
import { boltWordmark } from './BoltShell.js';
import { lessonMenuTrigger, lessonMenuPanel } from './LessonMenu.js';
import { state } from '../services/state.js';
import { timer } from '../services/timer.js';
import { sound } from '../services/sound.js';
import { proctor } from '../services/proctor.js';

export function navbarMarkup() {
  const session = state.session;

  return `
    <header class="relative flex flex-wrap items-center justify-between gap-3 border-b border-bolt-border px-6 py-3">
      <div class="flex items-center gap-4">
        ${boltWordmark('')}
        <span class="hidden items-center gap-1.5 rounded bg-bolt-callout px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-bolt-muted sm:inline-flex">
          <span class="h-1.5 w-1.5 rounded-full bg-bolt-green"></span>
          Proctored
        </span>
      </div>

      <div class="flex items-center gap-4">
        <span class="hidden text-xs text-bolt-caption md:inline">
          ${escapeHtml(session.studentName)}
          <span class="text-bolt-amber">(${escapeHtml(session.rollNumber)})</span>
        </span>

        <div id="nav-violations" class="hidden items-center gap-1.5 text-xs text-bolt-caption sm:flex">
          ${violationsMarkup(session.violations.length)}
        </div>

        <div id="nav-timer" class="flex items-center gap-2 rounded bg-bolt-ink px-3 py-1.5 text-white">
          ${icons.clock('w-4 h-4')}
          <span id="nav-timer-display" class="font-mono text-base font-bold tabular-nums">
            ${timer.getFormattedTime(session.remainingSec)}
          </span>
        </div>

        ${lessonMenuTrigger()}

        <button id="btn-toggle-sound" class="text-bolt-caption transition-colors hover:text-bolt-link" title="Toggle sound">
          ${sound.muted ? icons.volumeX('w-4 h-4') : icons.volume2('w-4 h-4')}
        </button>

        <button id="btn-toggle-fullscreen" class="text-bolt-caption transition-colors hover:text-bolt-link" title="Toggle fullscreen">
          ${icons.maximize('w-4 h-4')}
        </button>

        <button id="btn-nav-submit" class="btn-danger px-3 py-1.5 text-xs">
          ${icons.checkCircle('w-4 h-4')}
          <span>Submit Exam</span>
        </button>
      </div>

      ${lessonMenuPanel()}
    </header>
  `;
}

export function wireNavbar(root, { onOpenSubmitModal }) {
  root.querySelector('#btn-nav-submit')?.addEventListener('click', () => {
    sound.playClick();
    onOpenSubmitModal?.();
  });

  const btnSound = root.querySelector('#btn-toggle-sound');
  btnSound?.addEventListener('click', () => {
    const muted = sound.toggleMute();
    btnSound.innerHTML = muted ? icons.volumeX('w-4 h-4') : icons.volume2('w-4 h-4');
  });

  const btnFullscreen = root.querySelector('#btn-toggle-fullscreen');
  btnFullscreen?.addEventListener('click', async () => {
    sound.playClick();
    if (document.fullscreenElement) {
      await proctor.exitFullscreen();
      btnFullscreen.innerHTML = icons.maximize('w-4 h-4');
    } else {
      await proctor.enterFullscreen();
      btnFullscreen.innerHTML = icons.minimize('w-4 h-4');
    }
  });
}

export function updateNavbarTimer(remainingSec) {
  const display = document.getElementById('nav-timer-display');
  const container = document.getElementById('nav-timer');
  if (display) display.textContent = timer.getFormattedTime(remainingSec);
  if (!container) return;

  const base = 'flex items-center gap-2 rounded px-3 py-1.5 text-white';
  if (remainingSec <= 120) {
    container.className = `${base} bg-bolt-red animate-pulse`;
  } else if (remainingSec <= 600) {
    container.className = `${base} bg-[#cb6969]`;
  } else {
    container.className = `${base} bg-bolt-ink`;
  }
}

export function updateNavbarViolations(count) {
  const el = document.getElementById('nav-violations');
  if (el) el.innerHTML = violationsMarkup(count);
}

function violationsMarkup(count) {
  const tone = count > 0 ? 'text-bolt-red font-bold' : 'text-bolt-caption';
  return `
    ${icons.shieldAlert(`w-3.5 h-3.5 ${count > 0 ? 'text-bolt-red' : 'text-bolt-green'}`)}
    <span class="${tone}">${count} violation${count === 1 ? '' : 's'}</span>
  `;
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
