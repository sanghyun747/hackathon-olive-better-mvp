/* BellToggle — vanilla JS port of the React component.
 * Animated notification bell toggle with badge count.
 * Usage: const bell = mountBellToggle(container, { offLabel, onLabel, defaultPressed, onChange, count });
 *        bell.setPressed(true); bell.setCount(3);
 */
const SEG_EASE = 'cubic-bezier(0.77, 0, 0.175, 1)';
const WARP = 0.6;
const SIZES = { sm: [36, 12.5, 14, 15, 8], md: [44, 13.5, 16, 19, 9], lg: [52, 15, 18, 23, 10] };
const WOBBLE = { amplitude: 0.4, passes: 3, duration: 420 };
const BELL_PATH = 'M6 16.5V10a6 6 0 0 1 12 0v6.5l1.6 2.3H4.4L6 16.5z';

const passOffset = (k, passes) => 1 - Math.pow(1 - (k + 2 / 3) / (passes + 1), WARP);
const ringKeyframes = (from, amplitude, passes, decay) => {
  const frames = [{ transform: `rotate(${from}deg)`, offset: 0, easing: SEG_EASE }];
  for (let k = 0; k < passes; k++) {
    const angle = amplitude * Math.pow(1 - k / passes, decay) * (k % 2 ? 1 : -1);
    frames.push({ transform: `rotate(${angle.toFixed(2)}deg)`, offset: passOffset(k, passes), easing: SEG_EASE });
  }
  frames.push({ transform: 'rotate(0deg)', offset: 1 });
  return frames;
};
const liveAngle = el => {
  const tf = getComputedStyle(el).transform;
  if (!tf || tf === 'none') return 0;
  const m = new DOMMatrix(tf);
  return (Math.atan2(m.b, m.a) * 180) / Math.PI;
};

export function mountBellToggle(container, options = {}) {
  const {
    offLabel = '알림 꺼짐',
    onLabel = '알림 켜짐',
    label,
    color = '#f5f5f5',
    background = '#27272a',
    onColor = '#18181b',
    onBackground = '#f5f5f5',
    size = 'md',
    radius = 22,
    ringAmplitude = 17,
    ringPasses = 5,
    ringDecay = 1,
    ringDuration = 820,
    ringPivot = 16,
    crossfadeMs = 200,
    count = 0,
    badge = true,
    badgeColor = '#ef4444',
    badgeTextColor = '#ffffff',
    waves = true,
    pressed,
    defaultPressed = false,
    onChange,
    disabled = false
  } = options;

  let on = pressed ?? defaultPressed;
  let currentCount = count;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const [h, fs, iconSize, px, gap] = SIZES[size] ?? SIZES.md;

  const root = document.createElement('span');
  root.className = 'bell-toggle';
  root.dataset.on = on ? 'true' : 'false';
  if (disabled) root.dataset.disabled = '';
  Object.assign(root.style, {
    '--bt-color': color, '--bt-bg': background, '--bt-on-color': onColor, '--bt-on-bg': onBackground,
    '--bt-badge': badgeColor, '--bt-badge-ink': badgeTextColor, '--bt-radius': `${radius}px`,
    '--bt-fade': `${crossfadeMs}ms`, '--bt-pivot': `${ringPivot}%`, '--bt-h': `${h}px`,
    '--bt-fs': `${fs}px`, '--bt-icon': `${iconSize}px`, '--bt-px': `${px}px`, '--bt-gap': `${gap}px`
  });

  root.innerHTML = `
    <button type="button" class="bell-toggle__button" aria-pressed="${on}" aria-label="${label ?? offLabel}" ${disabled ? 'disabled' : ''}>
      <span class="bell-toggle__bell" aria-hidden="true">
        <span class="bell-toggle__glyph">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="${BELL_PATH}" />
            <path d="M10 20a2.2 2.2 0 0 0 4 0" />
          </svg>
        </span>
        ${waves ? `
        <svg class="bell-toggle__wave bell-toggle__wave--left" viewBox="0 0 14 14">
          <path d="M14 8a6 6 0 0 0-6 6" /><path d="M14 4A10 10 0 0 0 4 14" />
        </svg>
        <svg class="bell-toggle__wave bell-toggle__wave--right" viewBox="0 0 14 14">
          <path d="M0 8a6 6 0 0 1 6 6" /><path d="M0 4a10 10 0 0 1 10 10" />
        </svg>` : ''}
        ${badge ? `<span class="bell-toggle__badge"><span class="bell-toggle__digit">${currentCount > 9 ? '9+' : currentCount}</span></span>` : ''}
      </span>
      <span class="bell-toggle__say" aria-hidden="true">
        <span class="bell-toggle__face bell-toggle__face--off">${offLabel}</span>
        <span class="bell-toggle__face bell-toggle__face--on">${onLabel}</span>
      </span>
    </button>`;
  container.appendChild(root);

  const button = root.querySelector('.bell-toggle__button');
  const glyph = root.querySelector('.bell-toggle__glyph');
  const waveLeft = root.querySelector('.bell-toggle__wave--left');
  const waveRight = root.querySelector('.bell-toggle__wave--right');
  const badgeEl = root.querySelector('.bell-toggle__badge');
  const digit = root.querySelector('.bell-toggle__digit');

  const updateBadge = () => {
    if (!badgeEl) return;
    const show = badge && on && currentCount > 0;
    if (show) badgeEl.setAttribute('data-show', '');
    else badgeEl.removeAttribute('data-show');
    if (digit) digit.textContent = currentCount > 9 ? '9+' : String(currentCount);
  };

  const swing = (amplitude, passes, duration) => {
    if (!glyph || reduce) return;
    glyph.getAnimations().forEach(a => a.cancel());
    glyph.animate(ringKeyframes(liveAngle(glyph), amplitude, passes, ringDecay), { duration, easing: 'linear' });
    if (!waves) return;
    for (let k = 0; k < passes; k++) {
      const side = k % 2 ? waveRight : waveLeft;
      if (!side) continue;
      const strength = Math.pow(1 - k / passes, ringDecay);
      side.animate(
        [{ opacity: 0, transform: 'scale(0.55)' },
         { opacity: 0.9 * strength, offset: 0.3 },
         { opacity: 0, transform: 'scale(1.25)' }],
        { duration: 380, delay: passOffset(k, passes) * duration, easing: 'ease-out' }
      );
    }
  };

  const render = (animateSwing) => {
    root.dataset.on = on ? 'true' : 'false';
    button.setAttribute('aria-pressed', String(on));
    button.setAttribute('aria-label', label ?? (on ? onLabel : offLabel));
    updateBadge();
    if (animateSwing && on && !reduce) swing(ringAmplitude, ringPasses, ringDuration);
  };

  const setPressed = (value, animateSwing = true) => {
    on = Boolean(value);
    render(animateSwing);
  };

  button.addEventListener('pointerdown', () => { if (!disabled) root.dataset.pressed = ''; });
  for (const evt of ['pointerup', 'pointercancel', 'pointerleave']) {
    button.addEventListener(evt, () => delete root.dataset.pressed);
  }
  button.addEventListener('click', () => {
    if (disabled) return;
    const next = pressed === undefined ? !on : on;
    if (pressed === undefined) setPressed(!on);
    onChange?.(next);
  });

  updateBadge();

  return {
    setPressed,
    setCount(n) {
      const was = currentCount;
      currentCount = Math.max(0, Number(n) || 0);
      updateBadge();
      if (currentCount > was && on && !reduce) swing(ringAmplitude * WOBBLE.amplitude, WOBBLE.passes, WOBBLE.duration);
    },
    get pressed() { return on; },
    destroy() { root.remove(); }
  };
}
