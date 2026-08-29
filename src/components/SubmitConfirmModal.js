/**
 * Submission confirmation.
 */

import { LESSONS } from '../data/lessons.js';
import { state } from '../services/state.js';
import { sound } from '../services/sound.js';

export function showSubmitConfirmModal({ onConfirmSubmit }) {
  document.getElementById('proctor-submit-modal')?.remove();

  const session = state.session;
  const selected = LESSONS.filter((lesson) => session.selectedLessonIds.includes(lesson.id));
  const completed = selected.filter((lesson) => session.lessonProgress[lesson.id]?.completed).length;
  const pending = selected.length - completed;

  const modal = document.createElement('div');
  modal.id = 'proctor-submit-modal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in';
  modal.innerHTML = `
    <div class="bolt-card w-full max-w-md p-6">
      <h2 class="font-display text-xl font-bold text-bolt-ink">Submit your exam?</h2>
      <p class="pt-1 text-sm text-bolt-caption">
        Once submitted, your answers are locked and the report is generated.
      </p>

      <div class="mt-4 grid grid-cols-2 gap-3 text-center">
        <div class="bolt-callout">
          <div class="text-xs uppercase tracking-wide text-bolt-muted">Solved</div>
          <div class="font-mono text-xl font-bold text-bolt-green">${completed}</div>
        </div>
        <div class="bolt-callout">
          <div class="text-xs uppercase tracking-wide text-bolt-muted">Unsolved</div>
          <div class="font-mono text-xl font-bold text-bolt-ink">${pending}</div>
        </div>
      </div>

      ${pending > 0 ? `
        <p class="mt-3 rounded-[0.25em] bg-bolt-callout p-2.5 text-xs text-bolt-slate">
          You still have ${pending} unsolved lesson${pending === 1 ? '' : 's'}. There is time to go back.
        </p>
      ` : ''}

      <div class="mt-5 flex gap-3">
        <button id="btn-cancel-submit" class="btn-secondary flex-1 text-sm">Keep working</button>
        <button id="btn-confirm-submit" class="btn-success flex-1 text-sm">Submit now</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#btn-cancel-submit').addEventListener('click', () => {
    sound.playClick();
    modal.remove();
  });

  modal.querySelector('#btn-confirm-submit').addEventListener('click', () => {
    sound.playClick();
    modal.remove();
    onConfirmSubmit?.();
  });
}
