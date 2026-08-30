const LINES_GRADIENT = ['#2563EB', '#38BDF8', '#60A5FA'];
const MOBILE_QUERY = '(max-width: 768px)';

function isMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getConfig() {
  const mobile = isMobile();
  return {
    linesGradient: LINES_GRADIENT,
    enabledWaves: ['top', 'middle', 'bottom'],
    lineCount: mobile ? [3, 4, 3] : [5, 7, 5],
    lineDistance: [8, 6, 8],
    animationSpeed: 0.45,
    interactive: !mobile,
    parallax: !mobile,
    bendRadius: 5,
    bendStrength: -0.35,
    mouseDamping: 0.06,
    parallaxStrength: 0.12,
    mixBlendMode: 'normal',
    lowPower: mobile
  };
}

function schedule(fn) {
  const start = () => requestAnimationFrame(fn);
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(start, { timeout: 400 });
  } else {
    window.setTimeout(start, 0);
  }
}

schedule(async () => {
  const el = document.getElementById('page-background');
  if (!el) return;

  try {
    const { mountFloatingLines } = await import('./FloatingLines.js');
    let dispose = mountFloatingLines(el, getConfig());

    const media = window.matchMedia(MOBILE_QUERY);
    const onChange = () => {
      if (typeof dispose === 'function') dispose();
      el.replaceChildren();
      dispose = mountFloatingLines(el, getConfig());
    };

    if (media.addEventListener) {
      media.addEventListener('change', onChange);
    } else {
      media.addListener(onChange);
    }
  } catch (error) {
    console.warn('FloatingLines failed to load, using static fallback.', error);
  }
});
