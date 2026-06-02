// Inject a subtitle bar overlay on the page.
//
// Why: chapter cards (browser_video_chapter) are full-screen and interrupt
// the action. For continuous narration that explains what's happening
// without hiding the UI, a small persistent bar at the edge of the
// viewport works better.
//
// Usage: pass the body of this function as the `function` argument to
// mcp__playwright__browser_evaluate, immediately after navigating to the
// page, and again after every location.reload() (the bar is wiped on
// reload). Then call window.__setSubtitle(text) before each step to
// update the displayed caption. Call window.__setSubtitle('') or null to
// hide it.
//
// Positioning: defaults to bottom-center. Change `position` to 'top' if
// the app's footer area holds important UI that the subtitle would mask.
// Always pick a side that does NOT cover the part of the screen the
// viewer needs to read for the current step — e.g. if the form is at
// the top, put subtitles at the bottom; if the action happens at the
// bottom (footer button, fixed CTA), put subtitles at the top.
//
// minHold: each subtitle stays visible for at least this many ms before
// the next one can appear. Default 2500ms is calibrated for 2x post-
// speedup (≈1.25s on screen after ffmpeg, enough to read comfortably).
// Calls to __setSubtitle during the hold are queued and fire when it
// expires — they are never dropped.
//
// Idempotent: returns 'already' if the bar is still present.
//
// Pass arguments via the second arg of browser_evaluate, or hardcode
// `position` to 'top' / 'bottom' in the body before calling.

(opts = {}) => {
  if (document.getElementById('__subtitle')) return 'already';

  const position = opts.position || 'bottom'; // 'top' | 'bottom'
  const offset = opts.offset || 40; // px from the edge
  const minHold = opts.minHold ?? 2500; // ms before next subtitle can appear

  const s = document.createElement('div');
  s.id = '__subtitle';
  const baseStyle = {
    position: 'fixed',
    left: '50%',
    maxWidth: '80%',
    padding: '14px 28px',
    borderRadius: '12px',
    background: 'rgba(15,23,42,0.92)',
    color: '#f8fafc',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '22px',
    fontWeight: '500',
    letterSpacing: '0.2px',
    textAlign: 'center',
    lineHeight: '1.4',
    boxShadow:
      '0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08) inset',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    pointerEvents: 'none',
    zIndex: '2147483645',
    opacity: '0',
    transition: 'opacity 320ms ease, transform 320ms ease',
  };

  const hiddenOffset = position === 'top' ? '-20px' : '20px';
  Object.assign(s.style, baseStyle, {
    [position]: offset + 'px',
    transform: `translateX(-50%) translateY(${hiddenOffset})`,
  });

  document.documentElement.appendChild(s);

  let _holdUntil = 0;
  let _queueTimer = null;

  function _show(text) {
    const el = document.getElementById('__subtitle');
    if (!el) return;
    if (!text) {
      el.style.opacity = '0';
      el.style.transform = `translateX(-50%) translateY(${hiddenOffset})`;
      _holdUntil = 0;
      return;
    }
    el.style.opacity = '0';
    el.style.transform = `translateX(-50%) translateY(${hiddenOffset})`;
    setTimeout(() => {
      el.textContent = text;
      el.style.opacity = '1';
      el.style.transform = 'translateX(-50%) translateY(0)';
    }, 220);
    _holdUntil = Date.now() + minHold;
  }

  window.__setSubtitle = (text) => {
    if (_queueTimer) {
      clearTimeout(_queueTimer);
      _queueTimer = null;
    }
    const wait = _holdUntil - Date.now();
    if (wait > 0) {
      _queueTimer = setTimeout(() => {
        _queueTimer = null;
        _show(text);
      }, wait);
    } else {
      _show(text);
    }
  };

  // Optional: move the subtitle bar dynamically if a step needs a
  // different position to avoid masking the action.
  window.__moveSubtitle = (newPosition, newOffset) => {
    const el = document.getElementById('__subtitle');
    if (!el) return;
    el.style.top = el.style.bottom = '';
    el.style[newPosition] = (newOffset || offset) + 'px';
  };

  return 'installed';
};
