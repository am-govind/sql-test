/**
 * Top Navbar Component for Proctored Test Session (SQLBolt Light Style)
 */

import { icons } from './Icons.js';
import { state } from '../services/state.js';
import { timer } from '../services/timer.js';
import { sound } from '../services/sound.js';
import { proctor } from '../services/proctor.js';

export function renderNavbar(container, { onOpenSubmitModal, onToggleMute }) {
  const session = state.session;
  let isMuted = sound.muted;
  let isFullscreen = !!document.fullscreenElement;

  const html = `
    <!-- Top Blue Accent Bar -->
    <div class="h-1 bg-blue-600 w-full"></div>

    <header class="bg-white px-4 sm:px-6 h-16 flex items-center justify-between border-b border-slate-200 shadow-sm">
      <!-- Left: SQLBolt Brand & Student Identity -->
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold shadow-xs">
            ${icons.database('w-5 h-5')}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-base font-extrabold text-slate-800 tracking-tight leading-none">
                SQL<span class="text-blue-600">Bolt</span>
              </h1>
              <span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Proctored Exam
              </span>
            </div>
            <p class="text-[11px] text-slate-500 hidden sm:block mt-0.5">
              Learn SQL with simple, interactive exercises.
            </p>
          </div>
        </div>
      </div>

      <!-- Center: Student & Timer Info -->
      <div class="flex items-center gap-4">
        <!-- Student Identity Badge -->
        <div class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
          ${icons.user('w-4 h-4 text-blue-600')}
          <span>Student: <strong class="text-slate-900">${escapeHtml(session.studentName)}</strong></span>
          <span class="text-slate-400 font-mono text-[11px]">(${session.studentId})</span>
        </div>

        <!-- High-Visibility Timer Badge -->
        <div id="nav-timer-container" class="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white flex items-center gap-2.5 shadow-sm">
          <div class="text-blue-400" id="timer-icon">
            ${icons.clock('w-4 h-4')}
          </div>
          <div class="flex flex-col">
            <span class="text-[9px] uppercase font-semibold text-slate-400 tracking-wider leading-none mb-0.5">Time Remaining</span>
            <span id="nav-timer-display" class="font-mono text-base font-bold text-white tabular-nums leading-none">
              ${timer.getFormattedTime(session.remainingSec)}
            </span>
          </div>
        </div>

        <!-- Proctor Integrity Radar -->
        <div id="nav-proctor-radar" class="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span class="font-semibold">Proctor Active</span>
          <div class="w-px h-3 bg-emerald-200"></div>
          <div class="flex items-center gap-1 text-slate-600" id="radar-violations-count">
            ${icons.shieldAlert('w-3.5 h-3.5 text-amber-500')}
            <span>Violations: <strong class="text-slate-900 font-mono">${session.violations.length}</strong></span>
          </div>
        </div>
      </div>

      <!-- Right: Action Controls -->
      <div class="flex items-center gap-2">
        <!-- Sound Toggle -->
        <button id="btn-toggle-sound" class="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200" title="Toggle Proctor Sound">
          ${isMuted ? icons.volumeX('w-4.5 h-4.5') : icons.volume2('w-4.5 h-4.5')}
        </button>

        <!-- Fullscreen Toggle -->
        <button id="btn-toggle-fullscreen" class="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200" title="Toggle Fullscreen">
          ${isFullscreen ? icons.minimize('w-4.5 h-4.5') : icons.maximize('w-4.5 h-4.5')}
        </button>

        <!-- Submit Test Button -->
        <button id="btn-nav-submit" class="btn-danger text-xs px-3.5 py-2 font-bold flex items-center gap-1.5">
          ${icons.checkCircle('w-4 h-4')}
          <span>Submit Exam</span>
        </button>
      </div>
    </header>
  `;

  container.innerHTML = html;

  const btnSubmit = container.querySelector('#btn-nav-submit');
  if (btnSubmit) {
    btnSubmit.addEventListener('click', () => {
      sound.playClick();
      if (onOpenSubmitModal) onOpenSubmitModal();
    });
  }

  const btnSound = container.querySelector('#btn-toggle-sound');
  if (btnSound) {
    btnSound.addEventListener('click', () => {
      isMuted = sound.toggleMute();
      btnSound.innerHTML = isMuted ? icons.volumeX('w-4.5 h-4.5') : icons.volume2('w-4.5 h-4.5');
      if (onToggleMute) onToggleMute(isMuted);
    });
  }

  const btnFullscreen = container.querySelector('#btn-toggle-fullscreen');
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', async () => {
      sound.playClick();
      if (document.fullscreenElement) {
        await proctor.exitFullscreen();
        btnFullscreen.innerHTML = icons.maximize('w-4.5 h-4.5');
      } else {
        await proctor.enterFullscreen();
        btnFullscreen.innerHTML = icons.minimize('w-4.5 h-4.5');
      }
    });
  }
}

export function updateNavbarTimer(remainingSec, initialSec) {
  const displayEl = document.getElementById('nav-timer-display');
  const containerEl = document.getElementById('nav-timer-container');

  if (displayEl) {
    displayEl.textContent = timer.getFormattedTime(remainingSec);
  }

  if (containerEl && initialSec > 0) {
    if (remainingSec <= 120) {
      containerEl.className = 'px-3.5 py-1.5 rounded-lg bg-rose-600 text-white flex items-center gap-2.5 shadow-sm animate-pulse';
    } else if (remainingSec <= 600) {
      containerEl.className = 'px-3.5 py-1.5 rounded-lg bg-amber-600 text-white flex items-center gap-2.5 shadow-sm';
    }
  }
}

export function updateNavbarViolations(violationsCount) {
  const radarEl = document.getElementById('radar-violations-count');
  if (radarEl) {
    radarEl.innerHTML = `
      ${icons.shieldAlert('w-3.5 h-3.5 text-rose-600')}
      <span>Violations: <strong class="text-rose-600 font-mono font-bold">${violationsCount}</strong></span>
    `;
  }
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
