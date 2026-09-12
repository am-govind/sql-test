/**
 * Proctored exam view.
 *
 * The workspace is the real SQLBolt lesson, embedded from our own origin. If
 * that cannot be reached the offline workspace takes over so an exam in
 * progress is never lost.
 */

import { boltShell } from '../components/BoltShell.js';
import { navbarMarkup, wireNavbar, updateNavbarTimer, updateNavbarViolations } from '../components/Navbar.js';
import { wireLessonMenu } from '../components/LessonMenu.js';
import { renderIframeWorkspace } from '../components/IframeViewer.js';
import { renderNativeSqlBoltView } from '../components/NativeSqlBoltView.js';
import { showViolationModal } from '../components/ViolationModal.js';
import { showSubmitConfirmModal } from '../components/SubmitConfirmModal.js';
import { icons } from '../components/Icons.js';
import { LESSONS } from '../data/lessons.js';
import { state } from '../services/state.js';
import { timer } from '../services/timer.js';
import { proctor } from '../services/proctor.js';
import { mediaProctor } from '../services/mediaProctor.js';
import { sound } from '../services/sound.js';

export function renderTestPage(container, { onSubmitExam }) {
  const session = state.session;

  container.innerHTML = boltShell({
    header: navbarMarkup(),
    body: `
      <div id="exam-progress" class="border-b border-bolt-border px-6 py-2"></div>
      <div id="fallback-banner"></div>
      <div id="exam-workspace" class="min-h-[500px]"></div>
      <div id="exam-advance" class="border-t border-bolt-border p-4"></div>

      <!-- Live Proctor Cam Widget if Webcam enabled -->
      ${mediaProctor.videoStream ? `
        <div id="proctor-pip-cam" class="fixed top-16 right-4 z-40 overflow-hidden rounded-lg border-2 border-bolt-blue bg-black shadow-xl w-36 sm:w-44 transition-all">
          <div class="flex items-center justify-between bg-bolt-slate px-2 py-1 text-[10px] font-bold text-white">
            <span class="flex items-center gap-1">
              <span class="h-2 w-2 animate-pulse rounded-full bg-red-500"></span>
              REC • Proctoring
            </span>
            <span class="text-[9px] text-slate-300">Live</span>
          </div>
          <video id="proctor-pip-video" autoplay muted playsinline class="h-24 sm:h-28 w-full object-cover"></video>
        </div>
      ` : ''}
    `,
  });

  const root = container.querySelector('.bolt-card');
  const progressEl = container.querySelector('#exam-progress');
  const bannerEl = container.querySelector('#fallback-banner');
  const workspaceEl = container.querySelector('#exam-workspace');
  const advanceEl = container.querySelector('#exam-advance');

  // Wire PiP video stream if active
  if (mediaProctor.videoStream) {
    const pipVideo = container.querySelector('#proctor-pip-video');
    if (pipVideo) {
      pipVideo.srcObject = mediaProctor.videoStream;
    }
  }

  let workspace = null;
  let usingFallback = false;

  const currentLesson = () =>
    LESSONS.find((lesson) => lesson.id === state.session.currentLessonId) || LESSONS[0];

  function submitExam(reason) {
    timer.stop();
    proctor.stop();
    container.querySelector('#proctor-pip-cam')?.remove();
    workspace?.destroy?.();
    state.submitTest(reason).then(() => onSubmitExam?.());
  }

  function renderProgress() {
    const { selectedLessonIds, lessonProgress } = state.session;
    const solved = selectedLessonIds.filter((id) => lessonProgress[id]?.completed).length;
    const percent = selectedLessonIds.length
      ? Math.round((solved / selectedLessonIds.length) * 100)
      : 0;

    progressEl.innerHTML = `
      <div class="flex items-center justify-between text-xs text-bolt-caption">
        <span>${escapeHtml(currentLesson().title)}</span>
        <span class="font-bold text-bolt-slate">${solved} / ${selectedLessonIds.length} lessons solved</span>
      </div>
      <div class="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-bolt-rule">
        <div class="h-full bg-bolt-green transition-all duration-500" style="width: ${percent}%"></div>
      </div>
    `;
  }

  function renderAdvance() {
    const lesson = currentLesson();
    const solved = Boolean(state.session.lessonProgress[lesson.id]?.completed);
    const ids = state.session.selectedLessonIds;
    const isLast = ids.indexOf(lesson.id) === ids.length - 1;

    advanceEl.innerHTML = `
      <div class="flex items-center justify-between gap-4">
        <p class="text-xs text-bolt-caption">
          ${solved
            ? 'All tasks solved. Continue to the next lesson.'
            : 'Solve every task in the exercise above to unlock the next lesson.'}
        </p>
        <div class="flex items-center gap-2">
          <button id="btn-skip" class="btn-secondary px-3 py-1.5 text-xs">Skip</button>
          <button id="btn-continue" class="btn-success px-4 py-1.5 text-sm" ${solved && !isLast ? '' : 'disabled'}>
            ${isLast ? 'Final lesson' : 'Continue'}
          </button>
        </div>
      </div>
    `;

    advanceEl.querySelector('#btn-continue')?.addEventListener('click', () => {
      sound.playClick();
      goToAdjacentLesson(1);
    });
    advanceEl.querySelector('#btn-skip')?.addEventListener('click', () => {
      sound.playClick();
      goToAdjacentLesson(1, { allowUnsolved: true });
    });
  }

  function goToAdjacentLesson(offset, { allowUnsolved = false } = {}) {
    const ids = state.session.selectedLessonIds;
    const index = ids.indexOf(state.session.currentLessonId);
    const next = ids[index + offset];
    if (next === undefined) return;
    if (!allowUnsolved && !state.session.lessonProgress[state.session.currentLessonId]?.completed) return;
    selectLesson(next);
  }

  function selectLesson(lessonId) {
    state.setCurrentLesson(lessonId);
    mountWorkspace();
    renderProgress();
    renderAdvance();
  }

  /** Progress reported by the bridge watching SQLBolt's own verdict. */
  function handleProgress({ completed, sql }) {
    const lesson = currentLesson();
    if (sql) state.saveLessonSqlCode(lesson.id, sql);

    const wasCompleted = Boolean(state.session.lessonProgress[lesson.id]?.completed);
    if (completed && !wasCompleted) {
      state.toggleLessonCompleted(lesson.id, true);
      sound.playSuccessChime();
    }

    renderProgress();
    renderAdvance();
  }

  function useFallback(reason) {
    if (usingFallback) return;
    usingFallback = true;

    console.warn(`[workspace] embedded SQLBolt unavailable (${reason}); using offline workspace`);

    bannerEl.innerHTML = `
      <div class="flex items-start gap-2.5 border-b border-bolt-border bg-bolt-callout px-6 py-3 text-xs text-bolt-slate">
        ${icons.alertTriangle('w-4 h-4 shrink-0 text-bolt-red')}
        <span>
          <strong>Offline workspace.</strong>
          The embedded SQLBolt lesson could not be loaded, so the exam is continuing
          with the built-in exercise. Your progress is still being recorded.
        </span>
      </div>
    `;

    mountWorkspace();
  }

  function mountWorkspace() {
    workspace?.destroy?.();
    workspaceEl.innerHTML = '';

    const lesson = currentLesson();

    if (usingFallback) {
      renderNativeSqlBoltView(workspaceEl, {
        currentLesson: lesson,
        onLessonCompleted: () => {
          renderProgress();
          renderAdvance();
        },
      });
      workspace = null;
      return;
    }

    workspace = renderIframeWorkspace(workspaceEl, {
      lesson,
      onProgress: handleProgress,
      onNavigateToSlug: (slug) => {
        const target = LESSONS.find((item) => item.slug === slug);
        if (target && state.session.selectedLessonIds.includes(target.id)) {
          selectLesson(target.id);
        }
      },
      onFailure: useFallback,
    });
  }

  wireNavbar(root, {
    onOpenSubmitModal: () =>
      showSubmitConfirmModal({ onConfirmSubmit: () => submitExam('manual') }),
  });
  wireLessonMenu(root, { onSelectLesson: selectLesson });

  renderProgress();
  renderAdvance();
  mountWorkspace();

  proctor.start({
    onViolation: (result) => {
      updateNavbarViolations(state.session.violations.length);
      showViolationModal({
        violation: result.violation,
        strikesUsed: result.strikesUsed,
        maxStrikes: result.maxStrikes,
      });
    },
    onAutoSubmit: () => submitExam('tab_switch_autosubmit'),
  });

  timer.start(
    session.remainingSec ?? session.durationSec,
    (remaining) => {
      state.updateRemainingTime(remaining);
      updateNavbarTimer(remaining);
    },
    () => {
      sound.playAutoSubmitAlarm();
      submitExam('time_expired');
    }
  );
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
