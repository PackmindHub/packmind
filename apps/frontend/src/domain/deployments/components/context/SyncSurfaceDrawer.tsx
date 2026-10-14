import type { ComponentProps } from 'react';
import { PMDrawer, PMPortal, pmToaster } from '@packmind/ui';
import {
  SyncSurface,
  type SyncOutcome,
} from '../redesign/components/SyncSurface';

/**
 * The distribution review, over the list it was started from rather than in
 * place of it.
 *
 * It closes itself once the distribution is sent and reports the outcome in a
 * toast, so the reader lands back on the list that will show it.
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
                  onConfirm={(outcome) => {
                    pmToaster.create(outcomeToast(outcome));
                    onClose();
                  }}
                />
              )}
            </PMDrawer.Body>
          </PMDrawer.Content>
        </PMDrawer.Positioner>
      </PMPortal>
    </PMDrawer.Root>
  );
}

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? '' : 's'}`;

export function outcomeToast({
  installCount,
  pluginsStarted,
  pluginsRefused,
}: SyncOutcome): {
  type: 'success' | 'error';
  title: string;
  description: string;
} {
  const sentences: string[] = [];
  if (installCount > 0) {
    sentences.push(`${plural(installCount, 'destination')} updated.`);
  }
  /*
   * Said apart from the destinations: a plugin's pull request still has to be
   * merged before the catalog changes, so it is started rather than done.
   */
  if (pluginsStarted > 0) {
    sentences.push(
      `${plural(pluginsStarted, 'plugin')} sent for review on the marketplace.`,
    );
  }
  if (pluginsRefused > 0) {
    sentences.push(
      `${plural(pluginsRefused, 'plugin')} refused by the marketplace.`,
    );
  }

  return {
    type: pluginsRefused > 0 ? 'error' : 'success',
    title:
      pluginsRefused > 0
        ? 'Distribution partly failed'
        : installCount > 0
          ? 'Distribution done'
          : 'Distribution started',
    description: sentences.join(' '),
  };
}
