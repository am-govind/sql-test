/**
 * Proctor Sidebar Component (SQLBolt Light Style)
 * Progress Tracker, Task Guidance, Lesson Navigator, and Notes
 */

import { icons } from './Icons.js';
import { LESSONS } from '../data/lessons.js';
import { state } from '../services/state.js';
import { sound } from '../services/sound.js';

export function renderSidebar(container, { onSelectLesson, onToggleComplete, onSaveSqlCode }) {
  const session = state.session;
  const currentLesson = LESSONS.find(l => l.id === session.currentLessonId) || LESSONS[0];
  const progress = session.lessonProgress[currentLesson.id] || { completed: false, timeSpent: 0, sqlCode: '' };

  const selectedLessons = LESSONS.filter(l => session.selectedLessonIds.includes(l.id));
  const completedCount = selectedLessons.filter(l => session.lessonProgress[l.id]?.completed).length;
  const totalCount = selectedLessons.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const html = `
    <aside class="h-full flex flex-col bg-slate-50 border-l border-slate-200 overflow-hidden text-sm">
      <!-- Top Progress Summary -->
      <div class="p-4 border-b border-slate-200 bg-white">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold uppercase text-slate-500 tracking-wider">Exam Progress</span>
          <span class="text-xs font-bold text-blue-600 font-mono">${completedCount}/${totalCount} (${percentage}%)</span>
        </div>
        <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div class="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out" style="width: ${percentage}%;"></div>
        </div>
      </div>

      <!-- Scrollable Sidebar Content -->
      <div class="flex-1 overflow-y-auto p-4 space-y-5">
        
        <!-- Active Lesson Guidance Card -->
        <div class="glass-panel p-4 bg-white border border-slate-200 shadow-xs">
          <div class="flex items-start justify-between gap-2 mb-2">
            <div>
              <span class="inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-50 text-blue-700 border border-blue-200 mb-1">
                ${currentLesson.category.label}
              </span>
              <h2 class="text-sm font-bold text-slate-800 leading-tight">
                ${currentLesson.title}
              </h2>
            </div>
            <span class="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              ${currentLesson.points} pts
            </span>
          </div>

          <div class="text-xs text-slate-500 mb-3 flex items-center gap-1.5">
            <span>Database Table:</span>
            <span class="font-mono font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
              ${currentLesson.table}
            </span>
          </div>

          <!-- Tasks List -->
          <div class="mb-4 space-y-2">
            <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              ${icons.award('w-3.5 h-3.5 text-amber-500')}
              Exercise Tasks
            </h3>
            <ul class="space-y-1.5 text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
              ${currentLesson.tasks.map((task, idx) => `
                <li class="flex items-start gap-2">
                  <span class="text-blue-600 font-mono font-bold text-[10px] mt-0.5">${idx + 1}.</span>
                  <span>${task}</span>
                </li>
              `).join('')}
            </ul>
          </div>

          <!-- Hint Accordion -->
          <details class="group mb-4">
            <summary class="cursor-pointer text-xs font-semibold text-slate-600 hover:text-blue-600 flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors">
              <span class="flex items-center gap-1.5">
                ${icons.sparkles('w-3.5 h-3.5 text-amber-500')}
                <span>Syntax Hint & Tips</span>
              </span>
              <span class="text-slate-400 group-open:rotate-90 transition-transform">▸</span>
            </summary>
            <div class="p-2.5 mt-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-cyan-300 font-mono">
              ${currentLesson.hint}
            </div>
          </details>

          <!-- Solved Status Toggle -->
          <div class="pt-2 border-t border-slate-200">
            <button id="btn-toggle-solved" class="w-full ${progress.completed ? 'btn-success' : 'btn-primary'} py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 transition-all">
              ${progress.completed ? icons.check('w-4 h-4') : icons.play('w-4 h-4')}
              <span>${progress.completed ? '✓ Module Completed' : 'Mark as Solved'}</span>
            </button>
          </div>
        </div>

        <!-- Optional Solution Query Notes -->
        <div class="glass-panel p-3.5 bg-white border border-slate-200">
          <div class="flex items-center justify-between mb-1.5">
            <h3 class="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              ${icons.code('w-3.5 h-3.5 text-blue-600')}
              <span>Query Notes (Optional)</span>
            </h3>
            <span class="text-[10px] text-slate-400">Saved to Report</span>
          </div>
          <textarea id="scratchpad-sql" rows="3" placeholder="Paste your final SQL query here for grading records..." class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white resize-none">${escapeHtml(progress.sqlCode || '')}</textarea>
        </div>

        <!-- Lesson Navigator -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-xs font-bold uppercase text-slate-500 tracking-wider">Lesson Navigator</h3>
            <span class="text-[11px] text-slate-400">${selectedLessons.length} Modules</span>
          </div>
          <div class="space-y-1 max-h-64 overflow-y-auto pr-1">
            ${selectedLessons.map(lesson => {
              const p = session.lessonProgress[lesson.id] || { completed: false };
              const isActive = lesson.id === session.currentLessonId;
              
              return `
                <button data-lesson-id="${lesson.id}" class="lesson-nav-btn w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-all ${
                  isActive 
                    ? 'bg-blue-50 text-blue-800 border border-blue-300 font-bold shadow-2xs' 
                    : p.completed 
                      ? 'bg-emerald-50/60 text-slate-700 hover:bg-emerald-50 border border-emerald-200' 
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }">
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      p.completed ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                    }">
                      ${p.completed ? '✓' : lesson.id}
                    </div>
                    <span class="truncate">${lesson.shortTitle}</span>
                  </div>
                  <div class="flex items-center gap-1.5 flex-shrink-0">
                    <span class="text-[10px] font-mono text-slate-400">${lesson.points}p</span>
                    ${isActive ? '<span class="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>' : ''}
                  </div>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Violation Log Summary if Any -->
        ${session.violations.length > 0 ? `
          <div class="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs">
            <div class="font-bold text-rose-700 flex items-center gap-1.5 mb-1">
              ${icons.alertTriangle('w-4 h-4')}
              Recorded Infractions (${session.violations.length})
            </div>
            <ul class="space-y-1 text-[11px] text-slate-600 font-mono">
              ${session.violations.slice(-3).map(v => `
                <li class="flex items-center justify-between">
                  <span class="text-rose-600 truncate max-w-[170px]">${v.label}</span>
                  <span class="text-slate-400">${v.timestamp}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

      </div>
    </aside>
  `;

  container.innerHTML = html;

  const btnSolved = container.querySelector('#btn-toggle-solved');
  if (btnSolved) {
    btnSolved.addEventListener('click', () => {
      sound.playToggle();
      if (onToggleComplete) onToggleComplete(currentLesson.id);
    });
  }

  const scratchpad = container.querySelector('#scratchpad-sql');
  if (scratchpad) {
    scratchpad.addEventListener('input', (e) => {
      if (onSaveSqlCode) onSaveSqlCode(currentLesson.id, e.target.value);
    });
  }

  container.querySelectorAll('.lesson-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sound.playClick();
      const id = parseInt(btn.getAttribute('data-lesson-id'), 10);
      if (onSelectLesson) onSelectLesson(id);
    });
  });
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
