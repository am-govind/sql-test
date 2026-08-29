/**
 * Submission report and proctor audit log.
 */

import confetti from 'canvas-confetti';
import { boltShell, boltWordmark } from '../components/BoltShell.js';
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
    grade: { label: 'Incomplete', badge: 'Did Not Pass' },
  };

  const autoSubmitted =
    session.submissionReason === 'tab_switch_autosubmit' || session.submissionReason === 'strike_limit';

  if (analytics.percentage >= 70 && !autoSubmitted) {
    setTimeout(() => {
      sound.playSuccessChime();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }, 300);
  }

  const scoreColor =
    analytics.percentage >= 70 ? 'text-bolt-green' : analytics.percentage >= 40 ? 'text-[#cb6969]' : 'text-bolt-red';

  container.innerHTML = boltShell({
    width: 'max-w-5xl',
    header: `
      <header class="flex flex-wrap items-center justify-between gap-3 border-b border-bolt-border px-6 py-4">
        ${boltWordmark('Exam submission report')}
        <div class="no-print flex items-center gap-2">
          <button id="btn-export-json" class="btn-secondary px-3 py-1.5 text-xs">
            ${icons.download('w-4 h-4')}<span>Export JSON</span>
          </button>
          <button id="btn-print-report" class="btn-secondary px-3 py-1.5 text-xs">
            ${icons.printer('w-4 h-4')}<span>Print</span>
          </button>
          <button id="btn-retake-exam" class="btn-primary px-3 py-1.5 text-xs">
            ${icons.refresh('w-4 h-4')}<span>New exam</span>
          </button>
        </div>
      </header>
    `,
    body: `
      <div class="space-y-6 px-6 py-6">
        ${autoSubmitted ? `
          <div class="flex items-start gap-3 rounded-[0.25em] border border-bolt-red bg-bolt-callout p-4">
            ${icons.shieldAlert('w-5 h-5 shrink-0 text-bolt-red')}
            <div>
              <h2 class="text-sm font-bold text-bolt-red">Auto-submitted after a proctor violation</h2>
              <p class="pt-0.5 text-xs text-bolt-slate">
                A tab change or window switch was detected during the exam. The session was locked
                and submitted with the work completed up to that moment.
              </p>
            </div>
          </div>
        ` : ''}

        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 class="font-display text-[1.6em] font-bold text-bolt-ink">${escapeHtml(session.studentName)}</h1>
            <p class="pt-0.5 font-mono text-xs text-bolt-caption">
              ${escapeHtml(session.studentId)} &middot; ${new Date(session.submittedAt || Date.now()).toLocaleString()}
            </p>
          </div>
          <div class="text-right">
            <div class="font-mono text-4xl font-bold ${scoreColor}">${analytics.percentage}%</div>
            <div class="text-xs font-bold uppercase tracking-wide text-bolt-muted">${analytics.grade.label}</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          ${metric('Lessons solved', `${analytics.completedCount} / ${analytics.totalCount}`)}
          ${metric('Points', `${analytics.earnedPoints} / ${analytics.totalPossiblePoints}`)}
          ${metric('Time taken', timer.getFormattedTime(analytics.totalTimeTakenSec))}
          ${metric('Violations', String(analytics.totalViolations), analytics.totalViolations > 0 ? 'text-bolt-red' : 'text-bolt-green')}
        </div>

        <section>
          <h2 class="font-display pb-2 text-base text-bolt-slate">Lesson breakdown</h2>
          <div class="overflow-x-auto">
            <table class="bolt-table">
              <thead>
                <tr>
                  <th>#</th><th>Lesson</th><th>Status</th><th>Time</th><th>Last query</th>
                </tr>
              </thead>
              <tbody>
                ${session.selectedLessonIds.map((id) => {
                  const lesson = LESSONS.find((item) => item.id === id);
                  const progress = session.lessonProgress[id] || {};
                  return `
                    <tr>
                      <td class="font-mono text-bolt-caption">${lesson.id}</td>
                      <td>
                        <div class="font-bold text-bolt-ink">${escapeHtml(lesson.shortTitle)}</div>
                        <div class="text-xs text-bolt-caption">${escapeHtml(lesson.category.label)}</div>
                      </td>
                      <td>
                        ${progress.completed
                          ? '<span class="font-bold text-bolt-green">&#10003; Solved</span>'
                          : '<span class="text-bolt-caption">Unsolved</span>'}
                      </td>
                      <td class="font-mono">${timer.getFormattedTime(progress.timeSpent || 0)}</td>
                      <td>
                        ${progress.sqlCode
                          ? `<code class="block max-w-xs truncate text-xs text-bolt-link" title="${escapeHtml(progress.sqlCode)}">${escapeHtml(progress.sqlCode)}</code>`
                          : '<span class="text-bolt-amber">&mdash;</span>'}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 class="font-display pb-2 text-base text-bolt-slate">Proctor audit log</h2>
          ${session.violations.length > 0 ? `
            <ul class="divide-y divide-bolt-rule text-sm">
              ${session.violations.map((violation, index) => `
                <li class="flex items-center justify-between py-2">
                  <span><span class="font-mono text-bolt-red">#${index + 1}</span> ${escapeHtml(violation.label)}</span>
                  <span class="font-mono text-xs text-bolt-caption">
                    ${escapeHtml(violation.timestamp)} (+${timer.getFormattedTime(violation.timeElapsedSec)})
                  </span>
                </li>
              `).join('')}
            </ul>
          ` : `
            <p class="rounded-[0.25em] bg-bolt-callout p-3 text-sm text-bolt-green">
              Clean record. No tab switches or focus changes were detected.
            </p>
          `}
        </section>
      </div>
    `,
  });

  container.querySelector('#btn-print-report').addEventListener('click', () => window.print());
  container.querySelector('#btn-retake-exam').addEventListener('click', () => {
    sound.playClick();
    state.resetSession();
    onRetakeExam?.();
  });

  container.querySelector('#btn-export-json').addEventListener('click', () => {
    sound.playClick();
    const payload = {
      student: { name: session.studentName, id: session.studentId },
      exam: {
        submittedAt: new Date(session.submittedAt).toISOString(),
        submissionReason: session.submissionReason,
        durationSec: analytics.totalTimeTakenSec,
      },
      analytics,
      lessons: session.selectedLessonIds.map((id) => {
        const lesson = LESSONS.find((item) => item.id === id);
        const progress = session.lessonProgress[id] || {};
        return {
          lessonId: id,
          title: lesson.title,
          category: lesson.category.label,
          completed: Boolean(progress.completed),
          timeSpentSec: progress.timeSpent || 0,
          sqlQuery: progress.sqlCode || null,
        };
      }),
      violations: session.violations,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sqlbolt-exam-${session.studentName.replace(/\s+/g, '_')}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });
}

function metric(label, value, tone = 'text-bolt-ink') {
  return `
    <div class="rounded-[0.25em] bg-bolt-callout p-3 text-center">
      <div class="text-xs uppercase tracking-wide text-bolt-muted">${label}</div>
      <div class="pt-1 font-mono text-xl font-bold ${tone}">${value}</div>
    </div>
  `;
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
