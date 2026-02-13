import { useEffect, useRef } from 'react';
import { PMButton } from '@packmind/ui';

interface StartProductTourProps {
  /**
   * Custom trigger text for the button
   * @default "✨ Take a tour"
   */
  triggerText?: string;

  /**
   * Button variant from PM design system
   * @default "outline"
   */
  variant?:
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'outline'
    | 'ghost'
    | 'success'
    | 'warning'
    | 'danger';

  /**
   * Button size from PM design system
   * @default "sm"
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'xs' | '2xs';
}

export function StartProductTour({
  triggerText = '✨ Take a tour',
  variant = 'outline',
  size = 'sm',
}: StartProductTourProps) {
  const arcadeIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    function onArcadeIframeMessage(e: MessageEvent) {
      if (e.origin !== 'https://demo.arcade.software' || !e.isTrusted) return;

      const arcadeIframe = arcadeIframeRef.current;
      if (!arcadeIframe || !arcadeIframe.contentWindow) return;

      if (e.data.event === 'arcade-init') {
        arcadeIframe.contentWindow.postMessage(
          { event: 'register-popout-handler' },
          '*',
        );
      }

      if (e.data.event === 'arcade-popout-open') {
        arcadeIframe.style.height = '100%';
        arcadeIframe.style.zIndex = '9999999';
      }

      if (e.data.event === 'arcade-popout-close') {
        arcadeIframe.style.height = '0';
        arcadeIframe.style.zIndex = 'auto';
      }
    }

    window.addEventListener('message', onArcadeIframeMessage);

    const arcadeIframe = arcadeIframeRef.current;
    if (arcadeIframe && arcadeIframe.contentWindow) {
      arcadeIframe.contentWindow.postMessage(
        { event: 'register-popout-handler' },
        '*',
      );
    }

    return () => {
      if (arcadeIframe && arcadeIframe.contentWindow) {
        arcadeIframe.contentWindow.postMessage(
          { event: 'unregister-popout-handler' },
          '*',
        );
      }

      window.removeEventListener('message', onArcadeIframeMessage);
    };
  }, []);

  function onClickArcadeTrigger() {
    const arcadeIframe = arcadeIframeRef.current;
    if (arcadeIframe && arcadeIframe.contentWindow) {
      arcadeIframe.contentWindow.postMessage(
        { event: 'request-popout-open' },
        '*',
      );
    }
  }

  return (
    <>
      <PMButton onClick={onClickArcadeTrigger} variant={variant} size={size}>
        {triggerText}
      </PMButton>

      <iframe
        ref={arcadeIframeRef}
        src="https://demo.arcade.software/lVd6g6nPyiOEztyJrCFX?embed&embed_custom&show_copy_link=true"
        title="Packmind Product Tour"
        loading="lazy"
        allowFullScreen
        allow="clipboard-write"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: 0,
          colorScheme: 'light',
          border: 'none',
          zIndex: 'auto',
        }}
      />
    </>
  );
}
