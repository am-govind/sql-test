/**
 * Application entry and view router.
 */

import './style.css';
import { state } from './services/state.js';
import { renderEntryPage } from './pages/EntryPage.js';
import { renderTestPage } from './pages/TestPage.js';
import { renderResultsPage } from './pages/ResultsPage.js';

const appContainer = document.getElementById('app');

function renderApp() {
  if (!appContainer) return;

  switch (state.session.status) {
    case 'in_progress':
      renderTestPage(appContainer, { onSubmitExam: renderApp });
      break;
    case 'submitted':
      renderResultsPage(appContainer, { onRetakeExam: renderApp });
      break;
    default:
      renderEntryPage(appContainer, { onStartExam: renderApp });
  }
}

renderApp();
