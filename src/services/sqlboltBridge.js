/**
 * Bridge between the exam shell and the embedded SQLBolt page.
 *
 * The page is served through our own reverse proxy, so the iframe is
 * same-origin and its document can be read directly. That is the only way to
 * observe progress: SQLBolt exposes no API, posts no messages, and does not
 * persist progress anywhere we could read.
 */

/**
 * Structural markers this bridge depends on. If SQLBolt is redesigned these
 * stop matching, and the caller is told to fall back rather than silently
 * reporting every task as unsolved.
 */
const REQUIRED_SELECTORS = ['.exercise', '.tasks_list', '.continue'];

const LESSON_HREF = /^\/lesson\/([\w-]+)/;

export const lessonPath = (slug) => `/lesson/${slug}`;

/**
 * SQLBolt's own page furniture, hidden so our shell frames the exercise instead
 * of nesting a second header, menu and footer inside the card.
 *
 * The sponsorship block below is the only part that removes SQLBolt's ads and
 * attribution. Delete that one rule to leave their funding and credit intact.
 */
const CHROME_CSS = `
  body { background: transparent !important; overflow-x: hidden !important; }

  /* Our shell supplies the card, so drop SQLBolt's own frame. */
  body .content {
    margin: 0 !important;
    background: transparent !important;
    border-top: 0 !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    padding-bottom: 0 !important;
  }
  body .content > .header,
  body .content .menu_container,
  body .content .menu_buttons { display: none !important; }

  /* Lesson sequencing is driven by our shell, not SQLBolt's own next links. */
  body .footer { display: none !important; }

  /* Sponsorship block: ads, donations and social. */
  body .ga, body .copyright, .adsbygoogle, ins.adsbygoogle,
  .fb-like, .twitter-like, .twitter-share-button,
  .paypal, .paypal_donation_button { display: none !important; }
`;

function readDocument(iframe) {
  try {
    const doc = iframe.contentDocument;
    // Touch a property to surface cross-origin access errors here.
    return doc && doc.body ? doc : null;
  } catch {
    return null;
  }
}

/** Pull the student's query out of the ACE editor that SQLBolt mounts on `.sqlinput`. */
function readEditorSql(doc) {
  const host = doc.querySelector('.sqlinput');
  if (!host) return '';

  const value = host.env?.editor?.getValue?.();
  if (typeof value === 'string') return value.trim();

  // ACE renders only the visible lines, but exercise queries are a few lines at most.
  const lines = host.querySelectorAll('.ace_line');
  return Array.from(lines, (line) => line.textContent).join('\n').trim();
}

function readProgress(doc) {
  const items = Array.from(doc.querySelectorAll('.tasks_list li'));
  const solvedTasks = items.filter((li) => li.querySelector('.completed')).length;
  const continueLink = doc.querySelector('.continue');

  return {
    solvedTasks,
    totalTasks: items.length,
    // SQLBolt drops the `disabled` class once every task in the lesson passes.
    completed: Boolean(continueLink) && !continueLink.classList.contains('disabled'),
    sql: readEditorSql(doc),
  };
}

/**
 * Wire the shell to a loaded SQLBolt document.
 *
 * @returns {{ detach: () => void } | null} null when the page could not be bridged.
 */
export function attachSqlBoltBridge(iframe, { onProgress, onNavigate, onFailure } = {}) {
  const doc = readDocument(iframe);

  if (!doc) {
    onFailure?.('unreachable');
    return null;
  }

  const missing = REQUIRED_SELECTORS.filter((selector) => !doc.querySelector(selector));
  if (missing.length > 0) {
    onFailure?.(`missing:${missing.join(',')}`);
    return null;
  }

  const style = doc.createElement('style');
  style.textContent = CHROME_CSS;
  doc.head.appendChild(style);

  let last = '';
  const publish = () => {
    const progress = readProgress(doc);
    const fingerprint = `${progress.solvedTasks}/${progress.totalTasks}:${progress.completed}:${progress.sql}`;
    if (fingerprint === last) return;
    last = fingerprint;
    onProgress?.(progress);
  };

  const observer = new MutationObserver(publish);
  observer.observe(doc.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class'],
  });

  // ACE repaints on a rAF and does not always mutate observed nodes when only
  // the buffer changes, so keep a light poll as a safety net for query capture.
  const poll = setInterval(publish, 1000);

  const handleClick = (event) => {
    const link = event.target.closest?.('a[href]');
    if (!link) return;

    const href = link.getAttribute('href') || '';
    if (href === '#' || href.startsWith('#')) return;

    // Our shell owns lesson order, because an exam preset may cover only a
    // subset of lessons and SQLBolt's own links would walk the student out of it.
    const lesson = href.match(LESSON_HREF);
    if (lesson) {
      event.preventDefault();
      if (!link.classList.contains('disabled')) onNavigate?.(lesson[1]);
      return;
    }

    // Anything else leaves the exam, so refuse it.
    event.preventDefault();
  };

  doc.addEventListener('click', handleClick, true);

  const resize = () => {
    const height = Math.max(
      doc.documentElement.scrollHeight,
      doc.body.scrollHeight
    );
    if (height > 0) iframe.style.height = `${height}px`;
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(doc.body);

  resize();
  publish();

  return {
    detach() {
      observer.disconnect();
      resizeObserver.disconnect();
      clearInterval(poll);
      doc.removeEventListener('click', handleClick, true);
      style.remove();
    },
  };
}
