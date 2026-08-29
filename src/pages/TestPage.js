/**
 * Main Proctored Test Arena View (Native 1-to-1 SQLBolt Workspace & Real-Time Proctoring)
 */

import { renderNavbar, updateNavbarTimer, updateNavbarViolations } from '../components/Navbar.js';
import { renderSidebar } from '../components/Sidebar.js';
import { renderNativeSqlBoltView } from '../components/NativeSqlBoltView.js';
import { showViolationModal } from '../components/ViolationModal.js';
import { showSubmitConfirmModal } from '../components/SubmitConfirmModal.js';
import { LESSONS } from '../data/lessons.js';
import { state } from '../services/state.js';
import { timer } from '../services/timer.js';
import { proctor } from '../services/proctor.js';
import { sound } from '../services/sound.js';

export function renderTestPage(container, { onSubmitExam }) {
  const session = state.session;

  const html = `
    <div class="h-screen flex flex-col overflow-hidden bg-slate-50 select-none">
      <!-- Navbar Container -->
      <div id="test-navbar-container"></div>

      <!-- Main Split View Container -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Left / Center: Native SQLBolt Workspace -->
        <main class="flex-1 h-full min-w-0 bg-white flex flex-col" id="test-workspace-container">
          <!-- Rendered by NativeSqlBoltView -->
        </main>

        <!-- Right: Proctor Sidebar -->
        <div class="w-80 lg:w-96 flex-shrink-0 h-full border-l border-slate-200 bg-slate-50" id="test-sidebar-container">
          <!-- Rendered by Sidebar -->
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  const navbarContainer = container.querySelector('#test-navbar-container');
  const workspaceContainer = container.querySelector('#test-workspace-container');
  const sidebarContainer = container.querySelector('#test-sidebar-container');

  // Sub-render helpers
  function refreshSidebar() {
    renderSidebar(sidebarContainer, {
      onSelectLesson: (lessonId) => {
        state.setCurrentLesson(lessonId);
        refreshWorkspace();
        refreshSidebar();
      },
      onToggleComplete: (lessonId) => {
        state.toggleLessonCompleted(lessonId);
        refreshSidebar();
      },
      onSaveSqlCode: (lessonId, code) => {
        state.saveLessonSqlCode(lessonId, code);
      }
    });
  }

  function refreshWorkspace() {
    const currentLesson = LESSONS.find(l => l.id === state.session.currentLessonId) || LESSONS[0];
    renderNativeSqlBoltView(workspaceContainer, {
      currentLesson,
      onLessonCompleted: (lessonId) => {
        refreshSidebar();
      }
    });
  }

  // Initial renders
  renderNavbar(navbarContainer, {
    onOpenSubmitModal: () => {
      showSubmitConfirmModal({
        onConfirmSubmit: () => {
          doSubmitTest('manual');
        }
      });
    },
    onToggleMute: () => {}
  });

  refreshWorkspace();
  refreshSidebar();

  // Helper to finalize and submit test
  function doSubmitTest(reason = 'manual') {
    timer.stop();
    proctor.stop();
    state.submitTest(reason);
    if (onSubmitExam) onSubmitExam();
  }

  // Start Proctor Service
  proctor.start({
    onViolation: (result) => {
      updateNavbarViolations(state.session.violations.length);
      refreshSidebar();

      showViolationModal({
        violation: result.violation,
        strikesUsed: result.strikesUsed,
        maxStrikes: result.maxStrikes,
        onAcknowledge: () => {}
      });
    },
    onAutoSubmit: (result) => {
      doSubmitTest('tab_switch_autosubmit');
    }
  });

  // Start Countdown Timer
  const duration = session.durationSec;
  timer.start(
    duration,
    (remaining, initial) => {
      state.updateRemainingTime(remaining);
      updateNavbarTimer(remaining, initial);
    },
    () => {
      sound.playAutoSubmitAlarm();
      doSubmitTest('time_expired');
    }
  );
}
