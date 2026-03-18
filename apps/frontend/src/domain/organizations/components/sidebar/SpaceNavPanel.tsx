import type { RefObject } from 'react';
import { PMBox, PMCloseButton, PMDrawer, PMPortal } from '@packmind/ui';
import type { Space } from '@packmind/types';
import { SpaceNavSections } from './SpaceNavSections';

interface SpaceNavPanelProps {
  space: Space;
  orgSlug: string;
  open: boolean;
  onClose: () => void;
  containerRef: RefObject<HTMLElement | null>;
}

export function SpaceNavPanel({
  space,
  orgSlug,
  open,
  onClose,
  containerRef,
}: Readonly<SpaceNavPanelProps>) {
  return (
    <PMDrawer.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      placement="start"
      size="xs"
    >
      <PMPortal container={containerRef}>
        <PMDrawer.Backdrop position="absolute" />
        <PMDrawer.Positioner position="absolute">
          <PMDrawer.Content>
            <PMDrawer.Header>
              <PMDrawer.Title fontSize="sm">{space.name}</PMDrawer.Title>
            </PMDrawer.Header>
            <PMDrawer.Body paddingX={1} paddingY={2}>
              <SpaceNavSections orgSlug={orgSlug} spaceSlug={space.slug} />
            </PMDrawer.Body>
            <PMDrawer.CloseTrigger asChild>
              <PMCloseButton size="sm" />
            </PMDrawer.CloseTrigger>
          </PMDrawer.Content>
        </PMDrawer.Positioner>
      </PMPortal>
    </PMDrawer.Root>
  );
}
