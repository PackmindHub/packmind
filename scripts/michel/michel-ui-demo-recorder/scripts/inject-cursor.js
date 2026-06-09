// Inject an animated fake cursor over the page.
//
// Why: Playwright video recording uses a CDP screencast of the viewport.
// The OS cursor is never in the frame, so videos look like the app is
// operating itself. This script draws a DOM cursor that follows the
// CDP-dispatched mousemove/mousedown/mouseup events, giving viewers a
// visible click indicator.
//
// Usage: pass the body of this function as the `function` argument to
// mcp__playwright__browser_evaluate, immediately after navigating to the
// page, and again after every location.reload() (the DOM cursor is wiped
// on reload).
//
// Idempotent: returns 'already' if the cursor div is still present.

() => {
  if (document.getElementById('__fakeCursor')) return 'already';

  const c = document.createElement('div');
  c.id = '__fakeCursor';
  Object.assign(c.style, {
    position: 'fixed',
    width: '24px',
    height: '24px',
    pointerEvents: 'none',
    zIndex: '2147483647',
    background:
      'radial-gradient(circle at 35% 35%, rgba(59,130,246,1) 0%, rgba(59,130,246,0.85) 30%, rgba(29,78,216,0.55) 70%, transparent 100%)',
    borderRadius: '50%',
    transform: 'translate(-50%,-50%)',
    transition:
      'left 220ms cubic-bezier(.22,.61,.36,1), top 220ms cubic-bezier(.22,.61,.36,1), transform 90ms ease, background 90ms ease',
    boxShadow: '0 0 12px rgba(59,130,246,0.55), 0 2px 4px rgba(0,0,0,0.25)',
    left: '720px',
    top: '450px',
  });
  document.documentElement.appendChild(c);

  const ring = document.createElement('div');
  ring.id = '__fakeCursorRing';
  Object.assign(ring.style, {
    position: 'fixed',
    width: '24px',
    height: '24px',
    pointerEvents: 'none',
    zIndex: '2147483646',
    border: '2px solid rgba(59,130,246,0.6)',
    borderRadius: '50%',
    transform: 'translate(-50%,-50%) scale(1)',
    transition:
      'left 220ms cubic-bezier(.22,.61,.36,1), top 220ms cubic-bezier(.22,.61,.36,1), transform 400ms ease, opacity 400ms ease',
    opacity: '0',
    left: '720px',
    top: '450px',
  });
  document.documentElement.appendChild(ring);

  const sync = (x, y) => {
    c.style.left = x + 'px';
    c.style.top = y + 'px';
    ring.style.left = x + 'px';
    ring.style.top = y + 'px';
  };

  document.addEventListener(
    'mousemove',
    (e) => sync(e.clientX, e.clientY),
    true,
  );

  document.addEventListener(
    'mousedown',
    (e) => {
      sync(e.clientX, e.clientY);
      c.style.transform = 'translate(-50%,-50%) scale(0.55)';
      c.style.background =
        'radial-gradient(circle at 35% 35%, rgba(239,68,68,1) 0%, rgba(220,38,38,0.9) 35%, rgba(153,27,27,0.5) 75%, transparent 100%)';
      ring.style.opacity = '0.9';
      ring.style.transform = 'translate(-50%,-50%) scale(2.4)';
    },
    true,
  );

  document.addEventListener(
    'mouseup',
    () => {
      c.style.transform = 'translate(-50%,-50%) scale(1)';
      c.style.background =
        'radial-gradient(circle at 35% 35%, rgba(59,130,246,1) 0%, rgba(59,130,246,0.85) 30%, rgba(29,78,216,0.55) 70%, transparent 100%)';
      setTimeout(() => {
        ring.style.opacity = '0';
        ring.style.transform = 'translate(-50%,-50%) scale(1)';
      }, 50);
    },
    true,
  );

  return 'installed';
};
