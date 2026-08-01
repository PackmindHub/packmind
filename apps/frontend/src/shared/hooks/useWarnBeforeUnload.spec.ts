import { renderHook } from '@testing-library/react';

import { useWarnBeforeUnload } from './useWarnBeforeUnload';

/**
 * jsdom dispatches `beforeunload` but never acts on it, so the prompt is
 * observed the way a browser decides to show one: a cancelled event.
 */
function dispatchBeforeUnload(): Event {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

describe('useWarnBeforeUnload', () => {
  describe('when enabled', () => {
    it('asks the browser to confirm the unload', () => {
      renderHook(() => useWarnBeforeUnload(true));

      expect(dispatchBeforeUnload().defaultPrevented).toBe(true);
    });
  });

  describe('when disabled', () => {
    it('lets the unload through', () => {
      renderHook(() => useWarnBeforeUnload(false));

      expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
    });
  });

  describe('when it stops being enabled', () => {
    it('lets the unload through again', () => {
      const { rerender } = renderHook(
        ({ enabled }) => useWarnBeforeUnload(enabled),
        { initialProps: { enabled: true } },
      );

      rerender({ enabled: false });

      expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
    });
  });

  // Left behind, the listener would block a reload for the rest of the session.
  describe('when the component unmounts', () => {
    it('removes its listener', () => {
      const { unmount } = renderHook(() => useWarnBeforeUnload(true));

      unmount();

      expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
    });
  });
});
