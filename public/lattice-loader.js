/* LatticeLoader — vanilla JS port of the React component.
 * Animated lattice loading indicator with working/done/error states.
 * Usage: const loader = mountLatticeLoader(container, { label: '조사 중' });
 *        loader.setStatus('done'); loader.destroy();
 */
const PATTERNS = {
  arrow: { 3: { cells: [1, 2, 3, 0, 1, 2, 1, 2, 3], loop: 7.2, scale: 1 } },
  dots: { 3: { cells: [0, 1, 2, 0, 1, 2, 0, 1, 2], loop: 3, scale: 2.4 } },
  ripple: { 3: { cells: [2, 1, 2, 1, 0, 1, 2, 1, 2], loop: 4.8, scale: 1.5 } },
  spiral: { 3: { cells: [0, 1, 2, 7, 8, 3, 6, 5, 4], loop: 9, scale: 1.2, lit: 0.35 } },
  orbit: {
    3: { cells: [0, 1, 2, 7, null, 3, 6, 5, 4], loop: 8, scale: 1.2 },
    4: { cells: [0, 1, 2, 3, 11, null, null, 4, 10, null, null, 5, 9, 8, 7, 6], loop: 6, scale: 1.2, lit: 0.45 }
  },
  snake: {
    3: { cells: [0, 1, 2, 5, 4, 3, 6, 7, 8], loop: 9, scale: 1, lit: 0.35 },
    4: { cells: [0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12], loop: 16, scale: 1, lit: 0.25 }
  },
  sweep: { 4: { cells: [0, 1, 2, 3, 1, 2, 3, 4, 2, 3, 4, 5, 3, 4, 5, 6], loop: 5, scale: 1, lit: 0.45 } },
  spin: { 4: { cells: [0, 0, 1, 1, 0, 0, 1, 1, 3, 3, 2, 2, 3, 3, 2, 2], loop: 4, scale: 1.6, lit: 0.35 } },
  rain: { 4: { cells: [0, 2, 1, 3, 1, 3, 2, 4, 2, 4, 3, 5, 3, 5, 4, 6], loop: 4, scale: 1.2, lit: 0.35 } },
  pulse: { 4: { cells: [2, 1, 1, 2, 1, 0, 0, 1, 1, 0, 0, 1, 2, 1, 1, 2], loop: 2.4, scale: 2.5, lit: 0.45 } }
};
const DEFAULT_PATTERN = { 3: 'orbit', 4: 'sweep' };
const MARKS = {
  3: { done: [2, 3, 5, 7], error: [0, 2, 4, 6, 8] },
  4: { done: [7, 8, 10, 13], error: [0, 3, 5, 6, 9, 10, 12, 15] }
};

const resolvePattern = (pattern, grid) => {
  if (typeof pattern === 'string') {
    const named = PATTERNS[pattern];
    return (named && named[grid]) || PATTERNS[DEFAULT_PATTERN[grid]][grid];
  }
  const cells = Array.from({ length: grid * grid }, (_, i) => pattern.cells[i] ?? null);
  const max = Math.max(0, ...cells.filter(v => v != null));
  return { cells, loop: pattern.loop ?? max + 4.2, scale: pattern.scale ?? 1, lit: pattern.lit ?? 0.62 };
};
const fmt = ds => (ds < 600 ? `${(ds / 10).toFixed(1)}s` : `${Math.floor(ds / 600)}m ${((ds % 600) / 10).toFixed(1)}s`);

export function mountLatticeLoader(container, options = {}) {
  const {
    label = '조사 중',
    doneLabel = '완료',
    errorLabel = '실패',
    status = 'working',
    pattern = 'orbit',
    grid = 3,
    shape = 'round',
    color = 'currentColor',
    doneColor = '#22c55e',
    errorColor = '#ef4444',
    cellSize = 6,
    gap = 2,
    fontSize = 14,
    step = 90,
    idleOpacity = 0.15,
    glow = true,
    glowColor = '',
    showTimer = false
  } = options;

  const n = grid === 4 ? 4 : 3;
  const pat = resolvePattern(pattern, n);
  const marks = MARKS[n];
  const d = step * pat.scale;
  const cycle = Math.round(pat.loop * d);
  let currentStatus = status;
  let timerId = null;
  const startedAt = performance.now();

  const root = document.createElement('span');
  root.className = 'lattice-loader';
  root.setAttribute('role', 'status');
  root.dataset.status = currentStatus;
  root.dataset.shape = shape;
  if (glow) root.dataset.glow = '';
  Object.assign(root.style, {
    '--ll-n': n, '--ll-cell': `${cellSize}px`, '--ll-gap': `${gap}px`, '--ll-font': `${fontSize}px`,
    '--ll-color': color, '--ll-mark': errorColor, '--ll-idle': idleOpacity,
    '--ll-glow': glowColor || color, '--ll-cycle': `${cycle}ms`
  });

  const litAttr = pat.lit && pat.lit !== 0.62 ? ` data-lit="${Math.round(pat.lit * 100)}"` : '';
  const runCells = pat.cells.map((unit, i) =>
    `<span class="lattice-loader__cell"${unit == null ? ' data-hole' : ''}${litAttr}${unit == null ? '' : ` style="animation-delay:${Math.round(unit * d)}ms"`}></span>`
  ).join('');
  const markCells = (mark) => pat.cells.map((_, i) =>
    `<span class="lattice-loader__cell"${marks[mark].includes(i) ? ' data-on' : ''}></span>`
  ).join('');

  root.innerHTML = `
    <span class="lattice-loader__grid" aria-hidden="true">
      <span class="lattice-loader__layer lattice-loader__run">${runCells}</span>
      <span class="lattice-loader__layer lattice-loader__mark">${markCells('done')}</span>
    </span>
    <span class="lattice-loader__label" aria-hidden="true">
      <span class="lattice-loader__text" data-active>${label}</span>
      <span class="lattice-loader__text">${doneLabel}</span>
      <span class="lattice-loader__text">${errorLabel}</span>
    </span>
    ${showTimer ? `<span class="lattice-loader__timer">0.0s</span>` : ''}
    <span class="lattice-loader__sr">${label}, 진행 중</span>`;

  const markLayer = root.querySelector('.lattice-loader__mark');
  const timerEl = root.querySelector('.lattice-loader__timer');
  const srEl = root.querySelector('.lattice-loader__sr');
  const texts = root.querySelectorAll('.lattice-loader__text');

  const paintTimer = () => {
    if (timerEl) timerEl.textContent = fmt(Math.floor((performance.now() - startedAt) / 100));
  };
  if (currentStatus === 'working' && showTimer) timerId = setInterval(paintTimer, 100);

  const setStatus = (next) => {
    currentStatus = next;
    if (timerId) { clearInterval(timerId); timerId = null; }
    root.dataset.status = next;
    root.style.setProperty('--ll-mark', next === 'error' ? errorColor : doneColor);
    root.style.setProperty('--ll-mark-glow', glowColor || (next === 'error' ? errorColor : doneColor));
    markLayer.innerHTML = markCells(next === 'error' ? 'error' : 'done');
    texts.forEach((el, i) => {
      const key = ['working', 'done', 'error'][i];
      if (key === next) el.setAttribute('data-active', '');
      else el.removeAttribute('data-active');
    });
    if (srEl) srEl.textContent = next === 'working' ? `${label}, 진행 중` : next === 'done' ? doneLabel : errorLabel;
  };

  container.appendChild(root);
  return {
    setStatus,
    get status() { return currentStatus; },
    destroy() {
      if (timerId) clearInterval(timerId);
      root.remove();
    }
  };
}
