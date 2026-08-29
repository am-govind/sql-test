/**
 * Proctor warning shown when a violation is recorded but the exam continues.
 */

import { icons } from './Icons.js';
import { sound } from '../services/sound.js';

export function showViolationModal({ violation, strikesUsed, maxStrikes, onAcknowledge }) {
  document.getElementById('proctor-violation-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'proctor-violation-modal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in';
  modal.innerHTML = `
    <div class="bolt-card w-full max-w-md border-t-bolt-red p-6 text-center">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bolt-callout text-bolt-red">
        ${icons.shieldAlert('w-6 h-6')}
      </div>

      <h2 class="font-display pt-3 text-xl font-bold text-bolt-ink">Proctor warning</h2>
      <p class="pt-1 text-sm text-bolt-caption">
        Strike ${strikesUsed} of ${maxStrikes}. Leaving the exam window is monitored and recorded.
      </p>

      <div class="mt-4 bolt-callout text-left text-xs text-bolt-slate">
        <div class="flex justify-between"><span>Event</span><strong>${escapeHtml(violation.label)}</strong></div>
        <div class="flex justify-between pt-1"><span>Time</span><span class="font-mono">${escapeHtml(violation.timestamp)}</span></div>
      </div>

      <p class="mt-3 text-xs font-bold text-bolt-red">
        Another violation will immediately submit your exam.
      </p>

      <button id="btn-ack-violation" class="btn-primary mt-5 w-full text-sm">Resume exam</button>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#btn-ack-violation').addEventListener('click', () => {
    sound.playClick();
    modal.remove();
    onAcknowledge?.();
  });
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
