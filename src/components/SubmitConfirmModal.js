/**
 * Submission Confirmation Modal
 */

import { icons } from './Icons.js';
import { LESSONS } from '../data/lessons.js';
import { state } from '../services/state.js';
import { sound } from '../services/sound.js';

export function showSubmitConfirmModal({ onConfirmSubmit }) {
  const existing = document.getElementById('proctor-submit-modal');
  if (existing) existing.remove();

  const session = state.session;
  const selectedLessons = LESSONS.filter(l => session.selectedLessonIds.includes(l.id));
  const completed = selectedLessons.filter(l => session.lessonProgress[l.id]?.completed);
  const pending = selectedLessons.filter(l => !session.lessonProgress[l.id]?.completed);

  const modal = document.createElement('div');
  modal.id = 'proctor-submit-modal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in';

  modal.innerHTML = `
    <div class="glass-panel max-w-md w-full p-6 border-slate-700 bg-slate-950/95 shadow-2xl space-y-4">
      <div class="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mx-auto">
        ${icons.checkCircle('w-8 h-8')}
      </div>

      <div class="text-center space-y-1.5">
        <h2 class="text-lg font-bold text-white">Finalize & Submit Exam?</h2>
        <p class="text-xs text-slate-400">
          Once submitted, your answers and test session will be locked for grading.
        </p>
      </div>

      <!-- Overview Stats -->
      <div class="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
        <div>
          <div class="text-xs text-slate-500 uppercase font-semibold">Completed</div>
          <div class="text-xl font-bold text-emerald-400 font-mono">${completed.length}</div>
        </div>
        <div>
          <div class="text-xs text-slate-500 uppercase font-semibold">Uncompleted</div>
          <div class="text-xl font-bold text-amber-400 font-mono">${pending.length}</div>
        </div>
      </div>

      ${pending.length > 0 ? `
        <div class="p-2.5 rounded-lg bg-amber-950/30 border border-amber-900/40 text-[11px] text-amber-300">
          <strong>Note:</strong> You have <strong>${pending.length}</strong> uncompleted module(s). You can still go back and solve them before time runs out.
        </div>
      ` : ''}

      <div class="flex items-center gap-3 pt-2">
        <button id="btn-cancel-submit" class="btn-secondary flex-1 py-2.5 text-xs font-semibold">
          Continue Test
        </button>
        <button id="btn-confirm-submit" class="btn-primary flex-1 py-2.5 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500">
          Yes, Submit Now
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const btnCancel = modal.querySelector('#btn-cancel-submit');
  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      sound.playClick();
      modal.remove();
    });
  }

  const btnConfirm = modal.querySelector('#btn-confirm-submit');
  if (btnConfirm) {
    btnConfirm.addEventListener('click', () => {
      sound.playClick();
      modal.remove();
      if (onConfirmSubmit) onConfirmSubmit();
    });
  }
}
