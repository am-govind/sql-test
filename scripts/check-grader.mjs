/**
 * Self-consistency check for the offline grader.
 *
 * Every task's reference solution must grade as correct for that task, and an
 * unrelated query must not. Run with `node scripts/check-grader.mjs`.
 */

import { LESSONS } from '../src/data/lessons.js';
import { gradeLesson } from '../src/services/grader.js';

let failures = 0;

for (const lesson of LESSONS) {
  lesson.tasks.forEach((task, index) => {
    const { solved } = gradeLesson(lesson, task.solution);
    if (!solved[index]) {
      failures += 1;
      console.log(`FAIL  lesson ${lesson.id} task ${index + 1}: ${task.prompt}`);
      console.log(`      solution did not grade as correct: ${task.solution}`);
    }
  });
}

// A query that answers nothing should not satisfy any task.
const decoy = LESSONS[0];
const { solvedCount } = gradeLesson(decoy, 'SELECT 1 AS noise;');
if (solvedCount > 0) {
  failures += 1;
  console.log(`FAIL  decoy query satisfied ${solvedCount} task(s) in lesson ${decoy.id}`);
}

const total = LESSONS.reduce((sum, lesson) => sum + lesson.tasks.length, 0);
console.log(`\n${total - failures}/${total} task solutions grade correctly`);
process.exit(failures > 0 ? 1 : 0);
