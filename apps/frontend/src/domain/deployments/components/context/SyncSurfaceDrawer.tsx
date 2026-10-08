import type { ComponentProps } from 'react';
import { PMDrawer, PMPortal } from '@packmind/ui';
import { SyncSurface } from '../redesign/components/SyncSurface';

/**
 * The distribution review, over the list it was started from rather than in
 * place of it.
 *
 * The receipt stays up until the reader dismisses it, so `onConfirm` is left
 * to the review: closing is `onClose`, whichever way the flow ended.
 */
export function SyncSurfaceDrawer({
  open,
  onClose,
  ...surface
}: Readonly<
  Omit<
    ComponentProps<typeof SyncSurface>,
    'onCancel' | 'onConfirm' | 'bare' | 'scope'
  > & {
    /** What to review. Null until the first opening. */
    scope: ComponentProps<typeof SyncSurface>['scope'] | null;
    open: boolean;
    onClose: () => void;
  }
>) {
  const { scope } = surface;

  return (
    <PMDrawer.Root
      open={open}
      onOpenChange={(details) => {
        if (!details.open) onClose();
      }}
      /*
       * The review owns Escape and ignores it while a push is in flight; the
       * drawer closing on its own would cut that short.
       */
      closeOnEscape={false}
      closeOnInteractOutside={false}
      placement="end"
      size="lg"
    >
      <PMPortal>
        <PMDrawer.Backdrop />
        <PMDrawer.Positioner>
          <PMDrawer.Content>
            <PMDrawer.Body padding={0}>
              {open && scope && (
                <SyncSurface
                  {...surface}
                  scope={scope}
                  bare
                  onCancel={onClose}
                  onConfirm={() => undefined}
                />
              )}
            </PMDrawer.Body>
          </PMDrawer.Content>
        </PMDrawer.Positioner>
      </PMPortal>
    </PMDrawer.Root>
  );
}
