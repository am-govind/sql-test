/**
 * Test Results & Detailed Submission Analytics Page (Clean High-Contrast Light Theme)
 */

import confetti from 'canvas-confetti';
import { icons } from '../components/Icons.js';
import { LESSONS } from '../data/lessons.js';
import { state } from '../services/state.js';
import { sound } from '../services/sound.js';
import { timer } from '../services/timer.js';

export function renderResultsPage(container, { onRetakeExam }) {
  const session = state.session;
  const analytics = session.analytics || {
    completedCount: 0,
    totalCount: session.selectedLessonIds.length,
    earnedPoints: 0,
    totalPossiblePoints: 100,
    percentage: 0,
    totalTimeTakenSec: 0,
    totalViolations: 0,
    grade: { label: 'Incomplete', color: 'rose', badge: 'Did Not Pass' }
  };

  if (analytics.percentage >= 70 && session.submissionReason !== 'tab_switch_autosubmit') {
    setTimeout(() => {
      sound.playSuccessChime();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }, 300);
  }

  const isAutoSubmitted = session.submissionReason === 'tab_switch_autosubmit' || session.submissionReason === 'strike_limit';

  const html = `
    <!-- Top Blue Accent Bar -->
    <div class="h-1.5 bg-blue-600 w-full"></div>

    <div class="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full animate-fade-in space-y-8 bg-slate-50 text-slate-900">
      
      <!-- Top Action Bar (No-Print) -->
      <div class="flex items-center justify-between no-print border-b border-slate-200 pb-4">
        <div class="flex items-center gap-2 text-xs text-slate-600 font-medium">
          <span class="font-bold text-slate-900">SQLProctor</span>
          <span>/</span>
          <span>Exam Submission Report</span>
        </div>

        <div class="flex items-center gap-3">
          <button id="btn-export-json" class="btn-secondary text-xs px-3.5 py-2">
            ${icons.download('w-4 h-4 text-blue-600')}
            <span>Export Data (JSON)</span>
          </button>

          <button id="btn-print-report" class="btn-secondary text-xs px-3.5 py-2">
            ${icons.printer('w-4 h-4 text-slate-700')}
            <span>Print Report</span>
          </button>

          <button id="btn-retake-exam" class="btn-primary text-xs px-4 py-2">
            ${icons.refresh('w-4 h-4')}
            <span>Take New Exam</span>
          </button>
        </div>
      </div>

      <!-- Auto-Submit Infraction Banner if Applicable -->
      ${isAutoSubmitted ? `
        <div class="p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 shadow-xs flex items-start gap-3">
          <div class="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
            ${icons.shieldAlert('w-6 h-6')}
          </div>
          <div>
            <h3 class="text-sm font-bold text-red-900">Exam Auto-Submitted Due to Tab Switch Infraction</h3>
            <p class="text-xs text-red-700 mt-0.5 leading-relaxed">
              The proctor system detected a browser tab change or window minimization during active testing. The exam was immediately locked and submitted with the modules completed up to that moment.
            </p>
          </div>
        </div>
      ` : ''}

      <!-- Main Header / Student Summary Card -->
      <div class="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div class="flex items-center gap-2 mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                isAutoSubmitted ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }">
                ${isAutoSubmitted ? 'Auto-Submitted (Tab Switch)' : 'Submitted Successfully'}
              </span>
              <span class="text-xs text-slate-500 font-mono font-medium">${new Date(session.submittedAt || Date.now()).toLocaleString()}</span>
            </div>

            <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              ${escapeHtml(session.studentName)}
            </h1>
            <div class="text-xs text-slate-600 mt-1 flex items-center gap-2 font-mono">
              <span>Student ID: ${session.studentId}</span>
              <span>•</span>
              <span>Curriculum: 18 Modules</span>
            </div>
          </div>

          <!-- Score Card Widget -->
          <div class="flex items-center gap-5 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div class="text-right">
              <div class="text-3xl sm:text-4xl font-black font-mono tracking-tight ${
                analytics.percentage >= 70 ? 'text-emerald-600' : analytics.percentage >= 40 ? 'text-amber-600' : 'text-red-600'
              }">
                ${analytics.percentage}%
              </div>
              <div class="text-xs font-bold text-slate-700 uppercase tracking-wider mt-0.5">
                ${analytics.grade.label}
              </div>
            </div>

            <div class="w-14 h-14 rounded-full border-4 ${
              analytics.percentage >= 70 ? 'border-emerald-600 text-emerald-600 bg-emerald-50' : analytics.percentage >= 40 ? 'border-amber-600 text-amber-600 bg-amber-50' : 'border-red-600 text-red-600 bg-red-50'
            } flex items-center justify-center font-bold text-lg">
              ${analytics.grade.badge === 'Honors' || analytics.grade.badge === 'Exemplary' ? '★' : '✓'}
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-2xs">
          <div class="text-xs text-slate-500 uppercase font-bold tracking-wider">Modules Solved</div>
          <div class="text-2xl font-extrabold font-mono text-slate-900 mt-1">
            ${analytics.completedCount} <span class="text-sm font-normal text-slate-400">/ ${analytics.totalCount}</span>
          </div>
        </div>

        <div class="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-2xs">
          <div class="text-xs text-slate-500 uppercase font-bold tracking-wider">Points Earned</div>
          <div class="text-2xl font-extrabold font-mono text-blue-600 mt-1">
            ${analytics.earnedPoints} <span class="text-sm font-normal text-slate-400">/ ${analytics.totalPossiblePoints}</span>
          </div>
        </div>

        <div class="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-2xs">
          <div class="text-xs text-slate-500 uppercase font-bold tracking-wider">Time Elapsed</div>
          <div class="text-2xl font-extrabold font-mono text-slate-900 mt-1">
            ${timer.getFormattedTime(analytics.totalTimeTakenSec)}
          </div>
        </div>

        <div class="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-2xs">
          <div class="text-xs text-slate-500 uppercase font-bold tracking-wider">Tab Violations</div>
          <div class="text-2xl font-extrabold font-mono ${analytics.totalViolations > 0 ? 'text-red-600' : 'text-emerald-600'} mt-1">
            ${analytics.totalViolations}
          </div>
        </div>
      </div>

      <!-- Lesson-by-Lesson Submission Audit Table -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div class="flex items-center justify-between border-b border-slate-200 pb-3">
          <div class="flex items-center gap-2">
            ${icons.barChart('w-5 h-5 text-blue-600')}
            <h2 class="text-base font-bold text-slate-900">Module-by-Module Verification Breakdown</h2>
          </div>
          <span class="text-xs text-slate-500 font-mono">18 Curriculum Units</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider bg-slate-50">
                <th class="py-3 px-3">#</th>
                <th class="py-3 px-3">Module Name</th>
                <th class="py-3 px-3">Category</th>
                <th class="py-3 px-3">Status</th>
                <th class="py-3 px-3">Time Spent</th>
                <th class="py-3 px-3">Saved Query Notes</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              ${session.selectedLessonIds.map(id => {
                const lesson = LESSONS.find(l => l.id === id);
                const progress = session.lessonProgress[id] || { completed: false, timeSpent: 0, sqlCode: '' };

                return `
                  <tr class="hover:bg-slate-50 transition-colors">
                    <td class="py-3 px-3 font-mono text-slate-500 font-bold">${lesson.id}</td>
                    <td class="py-3 px-3">
                      <div class="font-bold text-slate-900">${lesson.title}</div>
                      <div class="text-[11px] text-slate-500 font-mono mt-0.5">Table: ${lesson.table}</div>
                    </td>
                    <td class="py-3 px-3">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                        ${lesson.category.label}
                      </span>
                    </td>
                    <td class="py-3 px-3">
                      ${progress.completed ? `
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ${icons.check('w-3.5 h-3.5')}
                          Completed
                        </span>
                      ` : `
                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          Unsolved
                        </span>
                      `}
                    </td>
                    <td class="py-3 px-3 font-mono text-slate-700 font-medium">
                      ${timer.getFormattedTime(progress.timeSpent || 0)}
                    </td>
                    <td class="py-3 px-3">
                      ${progress.sqlCode ? `
                        <code class="text-[11px] text-blue-700 bg-blue-50 px-2.5 py-1 rounded block max-w-xs truncate border border-blue-200 font-mono" title="${escapeHtml(progress.sqlCode)}">
                          ${escapeHtml(progress.sqlCode)}
                        </code>
                      ` : `
                        <span class="text-slate-400 italic">None saved</span>
                      `}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Proctor Audit Log -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div class="flex items-center gap-2">
          ${icons.shield('w-5 h-5 text-blue-600')}
          <h2 class="text-base font-bold text-slate-900">Proctor Integrity Audit Log</h2>
        </div>

        ${session.violations.length > 0 ? `
          <ul class="divide-y divide-slate-200 text-xs">
            ${session.violations.map((v, i) => `
              <li class="py-3 flex items-center justify-between text-slate-800">
                <div class="flex items-center gap-2">
                  <span class="text-red-600 font-bold font-mono">#${i + 1}</span>
                  <span class="text-red-700 font-bold">${v.label}</span>
                </div>
                <div class="text-slate-500 font-mono">
                  ${v.timestamp} (at +${timer.getFormattedTime(v.timeElapsedSec)})
                </div>
              </li>
            `).join('')}
          </ul>
        ` : `
          <div class="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            ${icons.checkCircle('w-4.5 h-4.5 text-emerald-600')}
            <span class="font-medium">Clean exam record! No tab switches or focus departures detected.</span>
          </div>
        `}
      </div>

    </div>
  `;

  container.innerHTML = html;

  const btnPrint = container.querySelector('#btn-print-report');
  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }

  const btnExport = container.querySelector('#btn-export-json');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      sound.playClick();
      const exportData = {
        student: {
          name: session.studentName,
          id: session.studentId
        },
        exam: {
          submittedAt: new Date(session.submittedAt).toISOString(),
          submissionReason: session.submissionReason,
          durationSec: analytics.totalTimeTakenSec
        },
        analytics: analytics,
        modules: session.selectedLessonIds.map(id => {
          const l = LESSONS.find(item => item.id === id);
          const p = session.lessonProgress[id] || {};
          return {
            lessonId: id,
            title: l.title,
            category: l.category.label,
            completed: !!p.completed,
            timeSpentSec: p.timeSpent || 0,
            sqlQuery: p.sqlCode || null
          };
        }),
        violations: session.violations
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SQLProctor_Report_${session.studentName.replace(/\s+/g, '_')}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const btnRetake = container.querySelector('#btn-retake-exam');
  if (btnRetake) {
    btnRetake.addEventListener('click', () => {
      sound.playClick();
      state.resetSession();
      if (onRetakeExam) onRetakeExam();
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
