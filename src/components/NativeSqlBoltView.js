/**
 * Native SQLBolt View (1-to-1 Match with Official SQLBolt Page Layout & Design)
 * Renders the authentic SQLBolt lesson text, reference tables, SQL editor, and exercise tasks.
 */

import { icons } from './Icons.js';
import { runQuery, initDatabase } from '../data/db.js';
import { state } from '../services/state.js';
import { sound } from '../services/sound.js';

export function renderNativeSqlBoltView(container, { currentLesson, onLessonCompleted }) {
  // Ensure database is initialized
  initDatabase();

  const progress = state.session.lessonProgress[currentLesson.id] || { completed: false, sqlCode: '' };
  let currentSql = progress.sqlCode || currentLesson.defaultQuery || 'SELECT * FROM movies;';
  let queryResult = runQuery(currentSql);
  let taskStatus = evaluateTasks(currentLesson, currentSql, queryResult);

  const html = `
    <div class="h-full flex flex-col bg-white text-slate-800 overflow-y-auto font-sans selection:bg-blue-500 selection:text-white">
      
      <!-- Top SQLBolt Header Bar -->
      <div class="border-b border-slate-200 px-6 py-3 bg-slate-50 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="w-8 h-8 rounded bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 font-bold text-sm">
            ${currentLesson.id}
          </span>
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-blue-600">${currentLesson.category.label}</span>
            <h1 class="text-lg font-bold text-slate-900 leading-tight">${currentLesson.title}</h1>
          </div>
        </div>

        <button id="btn-reset-sql" class="px-3 py-1.5 rounded bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5 shadow-2xs">
          ${icons.refresh('w-3.5 h-3.5 text-slate-500')}
          <span>Reset Exercise</span>
        </button>
      </div>

      <!-- Main SQLBolt Content Area -->
      <div class="p-6 sm:p-8 max-w-5xl mx-auto w-full space-y-6">
        
        <!-- Lesson Conceptual Explanation (SQLBolt Text) -->
        <div class="space-y-4 text-sm text-slate-700 leading-relaxed border-b border-slate-200 pb-6">
          <p class="text-base text-slate-800">${currentLesson.concept}</p>
          
          <!-- Code Definition Box -->
          <div class="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <div class="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Query Syntax</div>
            <pre class="font-mono text-xs text-blue-700 font-semibold leading-relaxed">${currentLesson.syntax}</pre>
          </div>
        </div>

        <!-- SQLBolt Interactive Exercise Sandbox -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
          
          <!-- Left: Table & SQL Query Editor (7 cols) -->
          <div class="lg:col-span-7 space-y-4">
            
            <!-- Table Header -->
            <div class="flex items-center justify-between text-xs font-bold text-slate-700">
              <span class="uppercase tracking-wider flex items-center gap-1.5">
                ${icons.database('w-4 h-4 text-blue-600')}
                Table: <span class="font-mono text-slate-900">${currentLesson.table}</span>
              </span>
              <span class="text-slate-500 font-mono text-[11px] font-normal" id="table-row-count">${queryResult.rows ? queryResult.rows.length : 0} rows</span>
            </div>

            <!-- SQLBolt Data Table -->
            <div class="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
              <div class="max-h-72 overflow-x-auto overflow-y-auto" id="sqlbolt-result-table">
                ${renderDataTable(queryResult)}
              </div>
            </div>

            ${!queryResult.success ? `
              <div class="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-mono font-medium">
                ⚠️ SQL Error: ${queryResult.error}
              </div>
            ` : ''}

            <!-- SQL Query Input Box -->
            <div class="space-y-1.5 pt-2">
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Type Your SQL Query Below:
              </label>
              <div class="relative">
                <textarea
                  id="sql-input-box"
                  rows="3"
                  spellcheck="false"
                  placeholder="SELECT * FROM movies;"
                  class="w-full p-3.5 rounded-lg bg-slate-900 border border-slate-800 text-sm font-mono text-cyan-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner resize-none leading-relaxed"
                >${escapeHtml(currentSql)}</textarea>
                <span class="absolute right-3 bottom-3.5 text-[10px] font-mono text-slate-500">SQLite Syntax</span>
              </div>
            </div>

          </div>

          <!-- Right: Exercise Tasks List (5 cols) -->
          <div class="lg:col-span-5 space-y-4">
            <div class="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3 shadow-2xs">
              <div class="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  ${icons.award('w-4 h-4 text-amber-500')}
                  <span>Exercise Tasks</span>
                </h3>
                <span id="tasks-solved-pill" class="text-[11px] font-bold font-mono px-2.5 py-0.5 rounded-full ${
                  taskStatus.allSolved ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-700'
                }">
                  ${taskStatus.solvedCount}/${currentLesson.tasks.length} Solved
                </span>
              </div>

              <!-- Tasks List -->
              <ul class="space-y-2 text-xs" id="tasks-checklist">
                ${currentLesson.tasks.map((task, idx) => {
                  const isDone = taskStatus.isSolved[idx];
                  return `
                    <li class="p-3 rounded-lg border transition-all flex items-start gap-2.5 ${
                      isDone 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-medium' 
                        : 'bg-white border-slate-200 text-slate-700'
                    }">
                      <div class="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${
                        isDone ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                      }">
                        ${isDone ? '✓' : idx + 1}
                      </div>
                      <span class="flex-1 leading-snug">${task}</span>
                    </li>
                  `;
                }).join('')}
              </ul>

              <!-- Solution Trigger Accordion -->
              <details class="group pt-2 border-t border-slate-200">
                <summary class="cursor-pointer text-xs font-semibold text-slate-600 hover:text-blue-600 flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 transition-colors">
                  <span>Stuck? Read Solution Hint</span>
                  <span class="text-slate-400 group-open:rotate-90 transition-transform">▸</span>
                </summary>
                <div class="p-3 mt-1.5 rounded-lg bg-slate-900 text-xs font-mono text-cyan-300 border border-slate-800 leading-relaxed">
                  ${currentLesson.hint}
                </div>
              </details>
            </div>
          </div>

        </div>

      </div>
    </div>
  `;

  container.innerHTML = html;

  const sqlInput = container.querySelector('#sql-input-box');
  const tableContainer = container.querySelector('#sqlbolt-result-table');
  const rowCountEl = container.querySelector('#table-row-count');
  const tasksChecklist = container.querySelector('#tasks-checklist');
  const tasksPill = container.querySelector('#tasks-solved-pill');

  function handleSqlChange(newSql) {
    state.saveLessonSqlCode(currentLesson.id, newSql);
    queryResult = runQuery(newSql);
    taskStatus = evaluateTasks(currentLesson, newSql, queryResult);

    if (tableContainer) {
      tableContainer.innerHTML = renderDataTable(queryResult);
    }
    if (rowCountEl) {
      rowCountEl.textContent = `${queryResult.rows ? queryResult.rows.length : 0} rows`;
    }

    if (tasksChecklist) {
      tasksChecklist.innerHTML = currentLesson.tasks.map((task, idx) => {
        const isDone = taskStatus.isSolved[idx];
        return `
          <li class="p-3 rounded-lg border transition-all flex items-start gap-2.5 ${
            isDone 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-medium' 
              : 'bg-white border-slate-200 text-slate-700'
          }">
            <div class="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${
              isDone ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
            }">
              ${isDone ? '✓' : idx + 1}
            </div>
            <span class="flex-1 leading-snug">${task}</span>
          </li>
        `;
      }).join('');
    }

    if (tasksPill) {
      tasksPill.textContent = `${taskStatus.solvedCount}/${currentLesson.tasks.length} Solved`;
      tasksPill.className = `text-[11px] font-bold font-mono px-2.5 py-0.5 rounded-full ${
        taskStatus.allSolved ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-700'
      }`;
    }

    if (taskStatus.allSolved) {
      state.toggleLessonCompleted(currentLesson.id, true);
      sound.playToggle();
      if (onLessonCompleted) onLessonCompleted(currentLesson.id);
    }
  }

  if (sqlInput) {
    sqlInput.addEventListener('input', (e) => {
      handleSqlChange(e.target.value);
    });
  }

  const btnReset = container.querySelector('#btn-reset-sql');
  if (btnReset && sqlInput) {
    btnReset.addEventListener('click', () => {
      const defaultQuery = currentLesson.defaultQuery || 'SELECT * FROM movies;';
      sqlInput.value = defaultQuery;
      handleSqlChange(defaultQuery);
    });
  }
}

function renderDataTable(result) {
  if (!result || !result.success) {
    return `<div class="p-6 text-center text-xs text-red-600 font-medium">Invalid SQL statement. Fix syntax to view data table.</div>`;
  }

  if (!result.columns || result.columns.length === 0) {
    return `<div class="p-6 text-center text-xs text-slate-500 font-medium">Query returned 0 rows.</div>`;
  }

  return `
    <table class="w-full text-left text-xs font-mono">
      <thead>
        <tr class="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase text-[11px] font-bold">
          ${result.columns.map(col => `<th class="py-2.5 px-3 font-bold border-r border-slate-200">${col}</th>`).join('')}
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200">
        ${result.rows.map((row, rIdx) => `
          <tr class="${rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50/50 transition-colors text-slate-800">
            ${row.map(val => `<td class="py-2 px-3 border-r border-slate-200">${val !== null && val !== undefined ? escapeHtml(val) : '<span class="text-slate-400 italic">NULL</span>'}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function evaluateTasks(lesson, sql, result) {
  if (!result || !result.success || !result.columns) {
    return { isSolved: lesson.tasks.map(() => false), solvedCount: 0, allSolved: false };
  }

  const normalizedSql = sql.trim().toLowerCase();

  const isSolved = lesson.tasks.map((task, idx) => {
    if (normalizedSql.includes('select')) {
      if (idx === 0) return true;
      if (normalizedSql.includes('where') || normalizedSql.includes('limit') || normalizedSql.includes('join') || normalizedSql.includes('group by') || normalizedSql.includes('order by')) {
        return true;
      }
    }
    return false;
  });

  const solvedCount = isSolved.filter(Boolean).length;
  return {
    isSolved,
    solvedCount,
    allSolved: solvedCount === lesson.tasks.length
  };
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
