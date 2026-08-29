/**
 * Violation / Anti-Cheat Warning Modal
 * Appears if Strike 1 mode is active and user triggers a violation.
 */

import { icons } from './Icons.js';
import { sound } from '../services/sound.js';

export function showViolationModal({ violation, strikesUsed, maxStrikes, onAcknowledge }) {
  // Remove any existing modal
  const existing = document.getElementById('proctor-violation-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'proctor-violation-modal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in';

  modal.innerHTML = `
    <div class="glass-panel max-w-md w-full p-6 border-rose-500/50 bg-slate-950/95 shadow-2xl shadow-rose-950/50 space-y-4">
      <div class="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto animate-bounce">
        ${icons.shieldAlert('w-8 h-8')}
      </div>

      <div class="text-center space-y-2">
        <span class="px-3 py-1 rounded-full text-xs font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
          Proctor Alert: Strike ${strikesUsed} of ${maxStrikes}
        </span>
        <h2 class="text-lg font-bold text-white">Browser Tab Switch Detected!</h2>
        <p class="text-xs text-slate-400 leading-relaxed">
          Leaving the exam window is strictly monitored. A strike has been recorded against your test integrity profile.
        </p>
      </div>

      <div class="p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 space-y-1 font-mono">
        <div class="flex justify-between">
          <span class="text-slate-400">Violation:</span>
          <span class="font-bold">${violation.label}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-400">Time:</span>
          <span>${violation.timestamp}</span>
        </div>
      </div>

      <div class="p-3 rounded-lg bg-amber-950/30 border border-amber-900/40 text-[11px] text-amber-300">
        <strong>⚠️ Warning:</strong> Another violation will immediately <strong>AUTO-SUBMIT</strong> your examination and finalize your score.
      </div>

      <button id="btn-ack-violation" class="btn-danger w-full py-3 text-xs font-bold tracking-wide">
        I Understand & Resume Exam
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  const btnAck = modal.querySelector('#btn-ack-violation');
  if (btnAck) {
    btnAck.addEventListener('click', () => {
      sound.playClick();
      modal.remove();
      if (onAcknowledge) onAcknowledge();
    });
  }
}
