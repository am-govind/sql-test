/**
 * Primary exam workspace: the real SQLBolt lesson, embedded from our own origin.
 */

import { attachSqlBoltBridge, lessonPath } from '../services/sqlboltBridge.js';

/** How long to wait for the proxied page before giving up and falling back. */
const LOAD_TIMEOUT_MS = 12000;

export function renderIframeWorkspace(container, { lesson, onProgress, onNavigateToSlug, onFailure }) {
  container.innerHTML = `
    <div class="relative w-full">
      <div id="frame-loader" class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-bolt-card py-24">
        <div class="h-8 w-8 animate-spin rounded-full border-[3px] border-bolt-border border-t-bolt-blue"></div>
        <p class="font-display text-sm text-bolt-slate">Loading ${escapeHtml(lesson.title)}</p>
      </div>
      <iframe
        id="sqlbolt-frame"
        title="SQLBolt exercise"
        class="w-full border-0 bg-transparent"
        style="height: 900px;"
        src="${lessonPath(lesson.slug)}"
      ></iframe>
    </div>
  `;

  const iframe = container.querySelector('#sqlbolt-frame');
  const loader = container.querySelector('#frame-loader');

  let bridge = null;
  let settled = false;

  const fail = (reason) => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timeoutId);
    onFailure?.(reason);
  };

  const timeoutId = window.setTimeout(() => fail('timeout'), LOAD_TIMEOUT_MS);

  const handleLoad = () => {
    bridge?.detach();
    bridge = attachSqlBoltBridge(iframe, {
      onProgress,
      onNavigate: onNavigateToSlug,
      onFailure: fail,
    });

    if (!bridge) return;

    settled = true;
    window.clearTimeout(timeoutId);
    loader?.remove();
  };

  iframe.addEventListener('load', handleLoad);
  iframe.addEventListener('error', () => fail('network'));

  return {
    destroy() {
      window.clearTimeout(timeoutId);
      bridge?.detach();
      iframe.removeEventListener('load', handleLoad);
      container.innerHTML = '';
    },
  };
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
