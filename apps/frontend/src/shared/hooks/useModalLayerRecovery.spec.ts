import { renderHook, waitFor } from '@testing-library/react';

import { useModalLayerRecovery } from './useModalLayerRecovery';

/** Reproduces what a stranded zag dialog layer leaves on the document. */
function leakModalBarriers(): HTMLElement {
  document.body.style.pointerEvents = 'none';
  document.body.style.overflow = 'hidden';
  document.body.setAttribute('data-inert', '');
  document.body.setAttribute('data-scroll-lock', '');

  const appRoot = document.createElement('div');
  appRoot.setAttribute('aria-hidden', 'true');
  appRoot.setAttribute('data-aria-hidden', '');
  document.body.appendChild(appRoot);

  return appRoot;
}

/** Adds the DOM a dialog has while it is genuinely on screen. */
function mountOpenDialog(): HTMLElement {
  const positioner = document.createElement('div');
  positioner.setAttribute('data-scope', 'dialog');
  positioner.setAttribute('data-part', 'positioner');
  document.body.appendChild(positioner);

  const content = document.createElement('div');
  content.setAttribute('data-scope', 'dialog');
  content.setAttribute('data-part', 'content');
  content.setAttribute('data-state', 'open');
  positioner.appendChild(content);

  return positioner;
}

describe('useModalLayerRecovery', () => {
  afterEach(() => {
    vi.clearAllMocks();
    document.body.removeAttribute('style');
    document.body.removeAttribute('data-inert');
    document.body.removeAttribute('data-scroll-lock');
    document.body.innerHTML = '';
  });

  describe('when a dialog stranded its barriers', () => {
    it('restores pointer events on the body', async () => {
      leakModalBarriers();
      renderHook(() => useModalLayerRecovery());

      await waitFor(() => {
        expect(document.body.style.pointerEvents).toBe('');
      });
    });

    it('removes the inert marker', async () => {
      leakModalBarriers();
      renderHook(() => useModalLayerRecovery());

      await waitFor(() => {
        expect(document.body.hasAttribute('data-inert')).toBe(false);
      });
    });

    it('restores scrolling', async () => {
      leakModalBarriers();
      renderHook(() => useModalLayerRecovery());

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('');
      });
    });

    it('releases the scroll lock', async () => {
      leakModalBarriers();
      renderHook(() => useModalLayerRecovery());

      await waitFor(() => {
        expect(document.body.hasAttribute('data-scroll-lock')).toBe(false);
      });
    });

    it('unhides the content it had hidden', async () => {
      const appRoot = leakModalBarriers();
      renderHook(() => useModalLayerRecovery());

      await waitFor(() => {
        expect(appRoot.hasAttribute('aria-hidden')).toBe(false);
      });
    });

    it('clears the hidden-element bookkeeping marker', async () => {
      const appRoot = leakModalBarriers();
      renderHook(() => useModalLayerRecovery());

      await waitFor(() => {
        expect(appRoot.hasAttribute('data-aria-hidden')).toBe(false);
      });
    });
  });

  describe('when the barriers appear after mount', () => {
    it('recovers on the resulting mutation', async () => {
      renderHook(() => useModalLayerRecovery());

      leakModalBarriers();

      await waitFor(() => {
        expect(document.body.style.pointerEvents).toBe('');
      });
    });
  });

  describe('when an element is left aria-hidden without its marker', () => {
    it('unhides it anyway', async () => {
      const appRoot = document.createElement('div');
      appRoot.setAttribute('aria-hidden', 'true');
      document.body.appendChild(appRoot);
      document.body.style.pointerEvents = 'none';

      renderHook(() => useModalLayerRecovery());

      await waitFor(() => {
        expect(appRoot.hasAttribute('aria-hidden')).toBe(false);
      });
    });
  });

  describe('when a dialog is genuinely open', () => {
    it('leaves the body barriers in place', async () => {
      leakModalBarriers();
      mountOpenDialog();

      renderHook(() => useModalLayerRecovery());
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(document.body.style.pointerEvents).toBe('none');
    });

    it('leaves the hidden content hidden', async () => {
      const appRoot = leakModalBarriers();
      mountOpenDialog();

      renderHook(() => useModalLayerRecovery());
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(appRoot.getAttribute('aria-hidden')).toBe('true');
    });

    it('recovers once that dialog is gone', async () => {
      leakModalBarriers();
      const positioner = mountOpenDialog();
      renderHook(() => useModalLayerRecovery());
      await new Promise((resolve) => setTimeout(resolve, 60));

      positioner.remove();

      await waitFor(() => {
        expect(document.body.style.pointerEvents).toBe('');
      });
    });
  });

  describe('when nothing leaked', () => {
    it('leaves an untouched body alone', async () => {
      renderHook(() => useModalLayerRecovery());
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(document.body.getAttribute('style')).toBeNull();
    });
  });
});
