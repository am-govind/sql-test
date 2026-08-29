/**
 * Entry & Student Onboarding Page (Neatly Arranged, Clean & High Contrast)
 */

import { icons } from '../components/Icons.js';
import { LESSONS, TEST_PRESETS } from '../data/lessons.js';
import { state } from '../services/state.js';
import { sound } from '../services/sound.js';
import { proctor } from '../services/proctor.js';

export function renderEntryPage(container, { onStartExam }) {
  let selectedPreset = 'full';
  let selectedDuration = 45 * 60; // 45 mins
  let selectedProctorMode = 'strict'; // 'strict' | 'strike_1'
  let fullscreenEnforced = true;
  let customLessonIds = LESSONS.map(l => l.id);

  const history = state.getHistory();

  const html = `
    <!-- Top Blue Accent Bar -->
    <div class="h-1.5 bg-blue-600 w-full"></div>

    <div class="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full animate-fade-in">
      
      <!-- Top Brand Header -->
      <header class="flex flex-col sm:flex-row items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold shadow-xs">
            ${icons.database('w-7 h-7')}
          </div>
          <div>
            <h1 class="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              SQL<span class="text-blue-600">Bolt</span>
              <span class="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                Proctored Test Suite
              </span>
            </h1>
            <p class="text-xs text-slate-500 mt-0.5">Learn SQL with simple, interactive exercises.</p>
          </div>
        </div>

        ${history.length > 0 ? `
          <button id="btn-view-history" class="btn-secondary text-xs px-4 py-2.5 font-semibold">
            ${icons.barChart('w-4 h-4 text-blue-600')}
            <span>Past Submissions (${history.length})</span>
          </button>
        ` : ''}
      </header>

      <!-- Main Config Grid: Neatly Arranged Two Columns -->
      <main class="grid grid-cols-1 lg:grid-cols-12 gap-8 my-8 items-start">
        
        <!-- Left Column: Student Details & Exam Settings (7 cols) -->
        <div class="lg:col-span-7 space-y-6">
          
          <!-- 1. Student Identity Card -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div class="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-2">
              ${icons.user('w-4.5 h-4.5 text-blue-600')}
              <span>Student Profile</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name <span class="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-student-name"
                  placeholder="e.g. Alex Johnson"
                  class="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 font-medium"
                  required
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Student ID / Roll No. (Optional)
                </label>
                <input
                  type="text"
                  id="input-student-id"
                  placeholder="e.g. CS2026-042"
                  class="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 font-mono"
                />
              </div>
            </div>
          </div>

          <!-- 2. Exam Module Preset Selector -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
              <div class="flex items-center gap-2 text-slate-900 font-bold text-sm">
                ${icons.award('w-4.5 h-4.5 text-blue-600')}
                <span>Curriculum Modules</span>
              </div>
              <span class="text-xs text-blue-700 font-bold" id="selected-module-badge">18 Lessons</span>
            </div>

            <div class="space-y-3">
              ${TEST_PRESETS.map(preset => `
                <label class="preset-card block p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white cursor-pointer transition-all ${
                  preset.id === 'full' ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20' : ''
                }">
                  <div class="flex items-start gap-3">
                    <input
                      type="radio"
                      name="exam-preset"
                      value="${preset.id}"
                      class="mt-1 accent-blue-600 w-4 h-4"
                      ${preset.id === 'full' ? 'checked' : ''}
                    />
                    <div class="flex-1">
                      <div class="flex items-center justify-between">
                        <span class="text-sm font-bold text-slate-900">${preset.name}</span>
                        <span class="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          ${preset.lessonIds.length} Lessons
                        </span>
                      </div>
                      <p class="text-xs text-slate-600 mt-1 leading-relaxed">${preset.description}</p>
                    </div>
                  </div>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- 3. Proctor Rules & Fixed Timer Configuration -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div class="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-2">
              ${icons.shieldAlert('w-4.5 h-4.5 text-blue-600')}
              <span>Proctoring Security & Fixed Exam Timer</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Duration Selection (Fixed Timed ONLY) -->
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Exam Timer (Fixed Duration)
                </label>
                <select id="select-duration" class="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-600">
                  <option value="900">15 Minutes (Speed Drill)</option>
                  <option value="1800">30 Minutes</option>
                  <option value="2700" selected>45 Minutes (Standard Exam)</option>
                  <option value="3600">60 Minutes (Comprehensive)</option>
                  <option value="5400">90 Minutes (Mastery)</option>
                </select>
              </div>

              <!-- Tab-Switch Strictness Policy -->
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tab-Switch Policy
                </label>
                <select id="select-proctor-mode" class="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-600">
                  <option value="strict" selected>Strict: Instant Auto-Submit</option>
                  <option value="strike_1">1 Warning Strike, then Submit</option>
                </select>
              </div>
            </div>

            <!-- Fullscreen Checkbox -->
            <label class="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
              <input type="checkbox" id="check-fullscreen" checked class="accent-blue-600 w-4.5 h-4.5 rounded" />
              <div class="text-xs">
                <span class="font-bold text-slate-900 block">Launch in Fullscreen Mode</span>
                <span class="text-slate-600">Minimizes distractions and monitors fullscreen exit events.</span>
              </div>
            </label>
          </div>

        </div>

        <!-- Right Column: Integrity Rules & Start Button (5 cols) -->
        <div class="lg:col-span-5 space-y-6">
          
          <!-- Proctoring Overview Card -->
          <div class="bg-blue-50/60 p-6 rounded-2xl border border-blue-200 shadow-sm space-y-5">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h2 class="text-xs font-bold uppercase tracking-wider text-blue-900">
                Automated Proctoring Rules
              </h2>
            </div>

            <div class="space-y-3 text-xs text-slate-700">
              <div class="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-blue-100 shadow-2xs">
                <span class="text-red-500 font-bold text-base mt-0.5">⚠️</span>
                <div>
                  <strong class="text-slate-900 block font-bold mb-0.5">Tab Switch Auto-Submit:</strong>
                  Switching browser tabs, minimizing the window, or navigating away will automatically lock and submit your test.
                </div>
              </div>

              <div class="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-blue-100 shadow-2xs">
                <span class="text-blue-600 font-bold text-base mt-0.5">⚡</span>
                <div>
                  <strong class="text-slate-900 block font-bold mb-0.5">Embedded SQL Bolt Page:</strong>
                  Complete exercises directly on the official SQLBolt page. Progress is automatically detected (**✓**).
                </div>
              </div>

              <div class="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-blue-100 shadow-2xs">
                <span class="text-emerald-600 font-bold text-base mt-0.5">📊</span>
                <div>
                  <strong class="text-slate-900 block font-bold mb-0.5">Submission Analytics:</strong>
                  Complete score report, correct submissions breakdown, and proctor audit log generated upon submission.
                </div>
              </div>
            </div>

            <!-- Start Action Button -->
            <div class="pt-2">
              <button id="btn-start-exam" class="btn-primary w-full py-4 text-sm font-bold uppercase tracking-wider shadow-md rounded-xl">
                ${icons.play('w-5 h-5')}
                <span>Start Proctored Exam</span>
              </button>
              <p class="text-[11px] text-slate-500 text-center mt-2.5">
                By starting, you agree to academic honesty and proctor monitoring.
              </p>
            </div>
          </div>

          <!-- Feature Highlights -->
          <div class="grid grid-cols-2 gap-4 text-center">
            <div class="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <div class="text-2xl font-extrabold text-blue-600 font-mono">18</div>
              <div class="text-xs text-slate-600 font-semibold mt-1">Interactive Modules</div>
            </div>
            <div class="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <div class="text-2xl font-extrabold text-emerald-600 font-mono">100%</div>
              <div class="text-xs text-slate-600 font-semibold mt-1">Real-Time Verification</div>
            </div>
          </div>

        </div>

      </main>

      <!-- Footer -->
      <footer class="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div>SQLProctor Test Platform • Powered by SQLBolt Interactive Exercises</div>
        <div>Strict Proctor Anti-Cheat System Active</div>
      </footer>

      <!-- History Modal Container -->
      <div id="history-modal-container"></div>
    </div>
  `;

  container.innerHTML = html;

  // Preset Selection Listener
  container.querySelectorAll('input[name="exam-preset"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      sound.playClick();
      selectedPreset = e.target.value;
      const preset = TEST_PRESETS.find(p => p.id === selectedPreset);
      if (preset) {
        customLessonIds = preset.lessonIds;
        selectedDuration = preset.defaultDuration;
        const selectDur = container.querySelector('#select-duration');
        if (selectDur) selectDur.value = String(selectedDuration);
      }

      container.querySelectorAll('.preset-card').forEach(card => {
        card.className = 'preset-card block p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white cursor-pointer transition-all';
      });
      const currentCard = e.target.closest('.preset-card');
      if (currentCard) {
        currentCard.className = 'preset-card block p-4 rounded-xl border border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20 cursor-pointer transition-all';
      }
    });
  });

  const selectDurationEl = container.querySelector('#select-duration');
  if (selectDurationEl) {
    selectDurationEl.addEventListener('change', (e) => {
      selectedDuration = parseInt(e.target.value, 10);
    });
  }

  const selectProctorModeEl = container.querySelector('#select-proctor-mode');
  if (selectProctorModeEl) {
    selectProctorModeEl.addEventListener('change', (e) => {
      selectedProctorMode = e.target.value;
    });
  }

  const checkFullscreenEl = container.querySelector('#check-fullscreen');
  if (checkFullscreenEl) {
    checkFullscreenEl.addEventListener('change', (e) => {
      fullscreenEnforced = e.target.checked;
    });
  }

  const btnHistory = container.querySelector('#btn-view-history');
  if (btnHistory) {
    btnHistory.addEventListener('click', () => {
      sound.playClick();
      showHistoryModal(container.querySelector('#history-modal-container'), history);
    });
  }

  const btnStart = container.querySelector('#btn-start-exam');
  const inputName = container.querySelector('#input-student-name');
  const inputId = container.querySelector('#input-student-id');

  if (btnStart) {
    btnStart.addEventListener('click', async () => {
      const studentName = inputName.value.trim();
      if (!studentName) {
        inputName.focus();
        inputName.style.borderColor = '#ef4444';
        sound.playWarningAlert();
        return;
      }

      sound.playClick();

      if (fullscreenEnforced) {
        await proctor.enterFullscreen();
      }

      state.startTest({
        studentName,
        studentId: inputId.value.trim(),
        presetId: selectedPreset,
        selectedLessonIds: customLessonIds,
        durationSec: selectedDuration,
        proctorMode: selectedProctorMode,
        fullscreenEnforced
      });

      if (onStartExam) onStartExam();
    });
  }
}

function showHistoryModal(container, history) {
  container.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div class="glass-panel max-w-2xl w-full p-6 border-slate-200 bg-white shadow-2xl space-y-4 rounded-2xl">
        <div class="flex items-center justify-between border-b border-slate-200 pb-3">
          <div class="flex items-center gap-2 text-slate-900 font-bold text-base">
            ${icons.barChart('w-5 h-5 text-blue-600')}
            <span>Past Test Submissions</span>
          </div>
          <button id="btn-close-history" class="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100">
            ${icons.check('w-5 h-5')}
          </button>
        </div>

        <div class="max-h-96 overflow-y-auto space-y-2">
          ${history.map(item => `
            <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <div class="font-bold text-slate-900 text-sm">${escapeHtml(item.studentName)}</div>
                <div class="text-slate-500 text-[11px] mt-0.5">
                  ${new Date(item.submittedAt).toLocaleString()} • ${item.completedCount}/${item.totalCount} Solved
                </div>
              </div>
              <div class="text-right">
                <span class="text-base font-bold font-mono ${item.percentage >= 70 ? 'text-emerald-600' : 'text-amber-600'}">
                  ${item.percentage}%
                </span>
                <div class="text-[10px] text-slate-500 font-medium">
                  ${item.reason === 'tab_switch_autosubmit' ? '⚠️ Auto-submitted' : 'Manual'}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  const btnClose = container.querySelector('#btn-close-history');
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      container.innerHTML = '';
    });
  }
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
