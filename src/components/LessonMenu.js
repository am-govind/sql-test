/**
 * Lesson navigator, modelled on SQLBolt's own header dropdown.
 *
 * Replaces the previous persistent sidebar so the embedded page gets the full
 * width of the card.
 */

import { LESSONS } from '../data/lessons.js';
import { state } from '../services/state.js';
import { sound } from '../services/sound.js';

export function lessonMenuTrigger() {
  return `
    <button id="btn-lesson-menu" class="font-display text-sm text-bolt-slate transition-colors hover:text-bolt-link">
      Lessons &#9662;
    </button>
  `;
}

/** Anchor for the dropdown. Positioned against the header, which is `relative`. */
export function lessonMenuPanel() {
  return `<div id="lesson-menu-panel" class="absolute right-6 top-full z-50"></div>`;
}

/**
 * @param {HTMLElement} root      element containing the trigger and panel
 * @param {(lessonId: number) => void} onSelectLesson
 */
export function wireLessonMenu(root, { onSelectLesson }) {
  const trigger = root.querySelector('#btn-lesson-menu');
  const panel = root.querySelector('#lesson-menu-panel');
  if (!trigger || !panel) return;

  let open = false;

  const close = () => {
    open = false;
    panel.innerHTML = '';
    document.removeEventListener('click', onDocumentClick, true);
  };

  const onDocumentClick = (event) => {
    if (!panel.contains(event.target) && event.target !== trigger) close();
  };

  const render = () => {
    const session = state.session;
    const lessons = LESSONS.filter((lesson) => session.selectedLessonIds.includes(lesson.id));

    panel.innerHTML = `
      <div class="w-[27em] max-w-[90vw] rounded-b-[0.25em] bg-bolt-menu p-3 shadow-[0_0_30px_rgba(0,0,0,0.3)]">
        <p class="font-display px-2 pb-2 text-[1.05em] text-[#444]">Exam Lessons</p>
        <div class="max-h-[60vh] overflow-y-auto">
          ${lessons.map((lesson) => row(lesson, session)).join('')}
        </div>
      </div>
    `;

    panel.querySelectorAll('[data-lesson-id]').forEach((button) => {
      button.addEventListener('click', () => {
        sound.playClick();
        close();
        onSelectLesson(Number(button.dataset.lessonId));
      });
    });
  };

  trigger.addEventListener('click', (event) => {
    event.stopPropagation();
    sound.playClick();
    if (open) {
      close();
      return;
    }
    open = true;
    render();
    document.addEventListener('click', onDocumentClick, true);
  });
}

function row(lesson, session) {
  const progress = session.lessonProgress[lesson.id] || {};
  const isActive = lesson.id === session.currentLessonId;

  return `
    <button
      data-lesson-id="${lesson.id}"
      class="flex w-full items-center justify-between gap-3 rounded px-2 py-1 text-left text-sm hover:bg-bolt-callout ${
        isActive ? 'font-bold text-bolt-link' : 'text-[#444]'
      }"
    >
      <span class="truncate">${lesson.shortTitle}</span>
      <span class="shrink-0 text-xs ${progress.completed ? 'text-bolt-green' : 'text-bolt-amber'}">
        ${progress.completed ? '&#10003; solved' : `${lesson.points}p`}
      </span>
    </button>
  `;
}
