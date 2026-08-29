/**
 * Application Entry & View Router with Frame-Recursion Safeguard
 */

import './style.css';
import { state } from './services/state.js';
import { renderEntryPage } from './pages/EntryPage.js';
import { renderTestPage } from './pages/TestPage.js';
import { renderResultsPage } from './pages/ResultsPage.js';

// CRITICAL SAFEGUARD: If this script is running inside an iframe, DO NOT render the proctor app shell!
// This completely prevents any recursive nested headers or iframe loops.
if (window.self !== window.top) {
  console.log('Inside iframe: proctor app shell suppressed.');
  // Allow SQLBolt iframe content to render normally without app shell
} else {
  const appContainer = document.getElementById('app');

  function renderApp() {
    if (!appContainer) return;
    const session = state.session;

    if (session.status === 'in_progress') {
      renderTestPage(appContainer, {
        onSubmitExam: () => {
          renderApp();
        }
      });
    } else if (session.status === 'submitted') {
      renderResultsPage(appContainer, {
        onRetakeExam: () => {
          renderApp();
        }
      });
    } else {
      renderEntryPage(appContainer, {
        onStartExam: () => {
          renderApp();
        }
      });
    }
  }

  // Initial mount
  renderApp();

  // State subscription
  state.subscribe((updatedSession) => {
    // Sync if status changed
  });
}
