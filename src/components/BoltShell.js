/**
 * The page frame shared by every view: a centred card matching SQLBolt's own
 * content panel, so the embedded lesson sits inside it without a visible seam.
 */

/**
 * @param {object} options
 * @param {string} options.header  markup for the header row
 * @param {string} options.body    markup for the card body
 * @param {string} [options.width] max width of the card
 */
export function boltShell({ header, body, width = 'max-w-[1170px]' }) {
  return `
    <div class="min-h-screen bg-bolt-bg py-6 px-3 sm:px-5">
      <div class="${width} mx-auto animate-fade-in">
        <div class="bolt-card overflow-hidden">
          ${header}
          ${body}
        </div>
        ${footer()}
      </div>
    </div>
  `;
}

/**
 * SQLBolt's wordmark. Reused across views so the shell reads as one product
 * with the embedded page.
 */
export function boltWordmark(subtitle = 'Learn SQL with simple, interactive exercises.') {
  return `
    <div class="flex items-baseline gap-2.5">
      <span class="font-display text-[1.5em] font-bold leading-none text-bolt-slate">
        SQL<span class="text-bolt-blue">Bolt</span>
      </span>
      ${subtitle ? `<span class="hidden text-xs text-bolt-caption sm:inline">${subtitle}</span>` : ''}
    </div>
  `;
}

function footer() {
  return `
    <p class="py-4 text-center text-xs text-bolt-amber">
      Exercises by <a href="https://sqlbolt.com" class="text-bolt-link hover:underline" target="_blank" rel="noreferrer">SQLBolt</a>,
      embedded for proctored assessment.
    </p>
  `;
}
