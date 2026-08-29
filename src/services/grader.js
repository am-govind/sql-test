/**
 * Grading for the offline workspace.
 *
 * A task is correct when the student's statement produces the same result as
 * the task's reference solution. Expected results are computed by running that
 * solution against a freshly seeded database, so no expected result sets have
 * to be maintained by hand.
 *
 * Only used when the embedded SQLBolt lesson is unavailable; otherwise SQLBolt
 * grades its own exercises.
 */

import { resetDatabase, runQuery } from '../data/db.js';

/** Expected results never change, so compute each one once. */
const expectedCache = new Map();

/**
 * Run a statement against a pristine database.
 * `verify` re-reads the data afterwards, which is how statements that change
 * data or schema (lessons 13-18) are checked.
 */
function resultOf(sql, verify) {
  resetDatabase();
  const result = runQuery(sql);
  if (!result.success) return result;
  return verify ? runQuery(verify) : result;
}

function normalizeCell(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Math.round(value * 10000) / 10000;
  if (typeof value === 'boolean') return value;
  const text = String(value).trim();
  const asNumber = Number(text);
  return text !== '' && Number.isFinite(asNumber)
    ? Math.round(asNumber * 10000) / 10000
    : text;
}

const serializeRow = (row) => JSON.stringify(row.map(normalizeCell));

function resultsMatch(expected, actual, { ordered = false, compareColumns = false } = {}) {
  if (!expected?.success || !actual?.success) return false;

  const expectedRows = expected.rows || [];
  const actualRows = actual.rows || [];
  if (expectedRows.length !== actualRows.length) return false;
  if ((expected.columns || []).length !== (actual.columns || []).length) return false;

  // Column names are normally ignored so aliases are accepted, but schema tasks
  // are precisely about the names, so those opt in.
  if (compareColumns) {
    const norm = (cols) => (cols || []).map((c) => String(c).toLowerCase()).sort();
    if (norm(expected.columns).join() !== norm(actual.columns).join()) return false;
  }

  const expectedSerialized = expectedRows.map(serializeRow);
  const actualSerialized = actualRows.map(serializeRow);

  if (ordered) {
    return expectedSerialized.every((row, i) => row === actualSerialized[i]);
  }

  return [...expectedSerialized].sort().join('|') === [...actualSerialized].sort().join('|');
}

/**
 * Grade a student's query against every task in a lesson.
 *
 * @returns {{ solved: boolean[], solvedCount: number, allSolved: boolean }}
 */
export function gradeLesson(lesson, studentSql) {
  const tasks = lesson.tasks || [];

  if (!studentSql || !studentSql.trim()) {
    return { solved: tasks.map(() => false), solvedCount: 0, allSolved: false };
  }

  const solved = tasks.map((task, index) => {
    const key = `${lesson.id}:${index}`;
    if (!expectedCache.has(key)) {
      expectedCache.set(key, resultOf(task.solution, task.verify));
    }

    const actual = resultOf(studentSql, task.verify);
    return resultsMatch(expectedCache.get(key), actual, task);
  });

  const solvedCount = solved.filter(Boolean).length;
  return { solved, solvedCount, allSolved: tasks.length > 0 && solvedCount === tasks.length };
}
