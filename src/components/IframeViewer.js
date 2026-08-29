/**
 * SQLBolt Embed & Iframe Workspace Component (White Theme & Auto-Tracker)
 */

import { icons } from './Icons.js';
import { LESSONS } from '../data/lessons.js';
import { state } from '../services/state.js';
import { sound } from '../services/sound.js';

export function renderIframeViewer(container, { onPrevLesson, onNextLesson, onAutoProgressUpdate }) {
  const session = state.session;
  const currentLesson = LESSONS.find(l => l.id === session.currentLessonId) || LESSONS[0];
  const selectedLessonIds = session.selectedLessonIds;
  const currentIndex = selectedLessonIds.indexOf(currentLesson.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < selectedLessonIds.length - 1;

  const html = `
    <div class="h-full flex flex-col bg-slate-100 overflow-hidden relative">
      <!-- Frame Top Action Strip -->
      <div class="h-10 px-4 bg-white border-b border-slate-200 flex items-center justify-between text-xs">
        <div class="flex items-center gap-2 text-slate-500 font-medium">
          <span class="w-2 h-2 rounded-full bg-blue-600"></span>
          <span class="font-mono text-[11px] text-slate-700 truncate max-w-xs sm:max-w-md">
            sqlbolt.com/lesson/${currentLesson.slug}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <!-- Previous Lesson -->
          <button id="btn-frame-prev" class="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-30 disabled:pointer-events-none" ${!hasPrev ? 'disabled' : ''} title="Previous Lesson">
            ${icons.chevronLeft('w-4 h-4')}
          </button>

          <!-- Reload Frame -->
          <button id="btn-frame-reload" class="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors" title="Reload SQL Bolt Page">
            ${icons.refresh('w-4 h-4')}
          </button>

          <!-- Next Lesson -->
          <button id="btn-frame-next" class="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-30 disabled:pointer-events-none" ${!hasNext ? 'disabled' : ''} title="Next Lesson">
            ${icons.chevronRight('w-4 h-4')}
          </button>
        </div>
      </div>

      <!-- Iframe Frame Container -->
      <div class="flex-1 relative bg-white">
        <div id="iframe-loader" class="absolute inset-0 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center text-slate-800 z-10 transition-opacity duration-300 pointer-events-none">
          <div class="w-9 h-9 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
          <span class="text-xs font-semibold text-slate-700">Loading SQLBolt Page...</span>
          <span class="text-[11px] text-slate-400 mt-1">${currentLesson.title}</span>
        </div>

        <iframe
          id="sqlbolt-frame"
          src="${currentLesson.url}"
          title="SQLBolt Workspace"
          class="w-full h-full border-none bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          loading="eager"
        ></iframe>
      </div>
    </div>
  `;

  container.innerHTML = html;

  const iframe = container.querySelector('#sqlbolt-frame');
  const loader = container.querySelector('#iframe-loader');

  function hideLoader() {
    if (loader) {
      loader.classList.add('opacity-0');
      setTimeout(() => {
        loader.style.display = 'none';
      }, 300);
    }
  }

  if (iframe) {
    iframe.addEventListener('load', hideLoader);
    setTimeout(hideLoader, 600);
  }

  // Auto-tracker listener from postMessage
  function handlePostMessage(event) {
    if (event.data && event.data.type === 'SQLBOLT_PROGRESS_UPDATE') {
      const { isCompleted } = event.data;
      if (isCompleted) {
        state.toggleLessonCompleted(currentLesson.id, true);
        if (onAutoProgressUpdate) onAutoProgressUpdate();
      }
    }
  }

  window.addEventListener('message', handlePostMessage);

  // Reload action
  const btnReload = container.querySelector('#btn-frame-reload');
  if (btnReload && iframe) {
    btnReload.addEventListener('click', () => {
      sound.playClick();
      if (loader) {
        loader.style.display = 'flex';
        loader.classList.remove('opacity-0');
      }
      iframe.src = currentLesson.url;
      setTimeout(hideLoader, 600);
    });
  }

  // Prev / Next actions
  const btnPrev = container.querySelector('#btn-frame-prev');
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      sound.playClick();
      if (onPrevLesson) onPrevLesson();
    });
  }

  const btnNext = container.querySelector('#btn-frame-next');
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      sound.playClick();
      if (onNextLesson) onNextLesson();
    });
  }
}
