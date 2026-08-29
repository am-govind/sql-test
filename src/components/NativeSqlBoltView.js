/**
 * Offline workspace, used when the embedded SQLBolt lesson cannot be reached.
 *
 * Mirrors SQLBolt's exercise anatomy: the result table and query editor on the
 * left, the task list and Continue state on the right. Queries run on an
 * explicit submit rather than per keystroke, which matches SQLBolt and keeps
 * the data-changing lessons (13-18) from executing partial statements as the
 * student types.
 */

import { resetDatabase, runQuery } from '../data/db.js';
import { gradeLesson } from '../services/grader.js';
import { state } from '../services/state.js';
import { sound } from '../services/sound.js';

export function renderNativeSqlBoltView(container, { currentLesson, onLessonCompleted }) {
  const stored = state.session.lessonProgress[currentLesson.id] || {};
  let sql = stored.sqlCode || currentLesson.defaultQuery || '';

  // Tasks are solved one query at a time, so accumulate across submissions.
  const solvedTasks = new Set();

  container.innerHTML = `
    <div class="px-6 py-5">
      <h1 class="font-display text-[1.6em] font-bold text-bolt-ink">${escapeHtml(currentLesson.title)}</h1>

      <div class="mt-3 space-y-3 text-[1.05em] leading-relaxed text-[#111]">
        <p>${escapeHtml(currentLesson.concept)}</p>
        <div class="bolt-callout">
          <div class="text-[0.8125em] text-[#555]">Syntax</div>
          <pre class="whitespace-pre pt-1 font-mono text-[0.95em] text-black">${escapeHtml(currentLesson.syntax)}</pre>
        </div>
      </div>

      <div class="mt-5 rounded-[0.25em] bg-bolt-exercise p-4">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div class="md:col-span-8">
            <div class="pb-1 text-[0.9375em] capitalize text-bolt-caption">Table: ${escapeHtml(currentLesson.table)}</div>
            <div class="border border-bolt-border bg-bolt-editor">
              <div id="result-table" class="max-h-[21em] overflow-auto"></div>
              <div class="border-t border-bolt-border bg-white p-2">
                <textarea
                  id="sql-input"
                  rows="4"
                  spellcheck="false"
                  class="w-full resize-none whitespace-pre border-0 p-1 font-mono text-sm focus:ring-0"
                  placeholder="SELECT * FROM movies;"
                >${escapeHtml(sql)}</textarea>
                <div class="flex items-center justify-between pt-1">
                  <span id="sql-message" class="text-[0.875em]"></span>
                  <div class="flex items-center gap-3 text-[0.875em]">
                    <button id="btn-reset" class="text-[#ccc] transition-colors hover:text-bolt-link">RESET</button>
                    <button id="btn-submit" class="font-bold text-bolt-link">SUBMIT</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="md:col-span-4">
            <div class="h-full border border-bolt-border bg-bolt-tasks p-3">
              <div class="font-display pb-2 text-[0.875em] font-bold text-bolt-muted">
                Exercise &mdash; <span class="text-[#626a79]">Tasks</span>
              </div>
              <ol id="task-list" class="space-y-1 pl-4 text-[0.9375em]"></ol>
              <details class="pt-3 text-[0.825em] text-[#867d7d]">
                <summary class="cursor-pointer text-bolt-link">Stuck? Read the solution hint.</summary>
                <p class="pt-1">${escapeHtml(currentLesson.hint)}</p>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const tableEl = container.querySelector('#result-table');
  const listEl = container.querySelector('#task-list');
  const messageEl = container.querySelector('#sql-message');
  const inputEl = container.querySelector('#sql-input');

  function renderTasks() {
    listEl.innerHTML = currentLesson.tasks
      .map((task, index) => {
        const done = solvedTasks.has(index);
        return `
          <li class="border-b border-bolt-rule py-1 last:border-0 ${done ? '' : 'opacity-50'}">
            ${done ? '<span class="pr-1.5 font-bold text-bolt-green">&#10003;</span>' : ''}
            ${escapeHtml(task.prompt)}
          </li>
        `;
      })
      .join('');
  }

  function renderTable(result) {
    if (!result.success) {
      tableEl.innerHTML = `<p class="p-4 text-center text-sm text-bolt-red">${escapeHtml(result.error)}</p>`;
      return;
    }
    if (!result.columns?.length) {
      tableEl.innerHTML = '<p class="p-4 text-center text-sm text-bolt-caption">Statement executed. No rows returned.</p>';
      return;
    }

    tableEl.innerHTML = `
      <table class="bolt-table">
        <thead><tr>${result.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>
        <tbody>
          ${result.rows
            .map(
              (row) => `<tr>${row
                .map((cell) => `<td>${cell === null || cell === undefined ? '<em class="text-bolt-amber">NULL</em>' : escapeHtml(cell)}</td>`)
                .join('')}</tr>`
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  function submit() {
    sql = inputEl.value;
    state.saveLessonSqlCode(currentLesson.id, sql);

    const { solved } = gradeLesson(currentLesson, sql);
    solved.forEach((isSolved, index) => {
      if (isSolved) solvedTasks.add(index);
    });

    // Show what the student's own query returns, on a clean database.
    resetDatabase();
    const result = runQuery(sql);
    renderTable(result);
    renderTasks();

    const newlySolved = solved.some(Boolean);
    if (!result.success) {
      messageEl.className = 'text-[0.875em] text-bolt-red';
      messageEl.textContent = result.error;
    } else if (newlySolved) {
      messageEl.className = 'text-[0.875em] text-bolt-green';
      messageEl.textContent = 'Correct!';
    } else {
      messageEl.className = 'text-[0.875em] text-bolt-caption';
      messageEl.textContent = 'Query ran, but does not match any task yet.';
    }

    if (solvedTasks.size === currentLesson.tasks.length) {
      state.toggleLessonCompleted(currentLesson.id, true);
      sound.playToggle();
      onLessonCompleted?.(currentLesson.id);
    }
  }

  container.querySelector('#btn-submit').addEventListener('click', submit);
  container.querySelector('#btn-reset').addEventListener('click', () => {
    inputEl.value = currentLesson.defaultQuery || '';
    messageEl.textContent = '';
  });
  inputEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) submit();
  });

  resetDatabase();
  renderTable(runQuery(currentLesson.defaultQuery || 'SELECT * FROM movies;'));
  renderTasks();
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
