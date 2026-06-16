import type { RefObject } from 'react';
import {
  PMBox,
  PMCloseButton,
  PMDrawer,
  PMIconButton,
  PMPortal,
} from '@packmind/ui';
import { LuSlidersHorizontal } from 'react-icons/lu';
import { useNavigate } from 'react-router';
import type { Space } from '@packmind/types';
import { SidebarNavigationDataTestId } from '@packmind/frontend';
import { routes } from '../../../../shared/utils/routes';
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
  const navigate = useNavigate();

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
        <PMDrawer.Backdrop position="absolute" boxSize="full" />
        <PMDrawer.Positioner position="absolute" boxSize="full">
          <PMDrawer.Content>
            <PMDrawer.Header>
              <PMBox display="flex" alignItems="center" gap={1}>
                <PMDrawer.Title fontSize="sm">{space.name}</PMDrawer.Title>
                <PMIconButton
                  aria-label="Space settings"
                  size="2xs"
                  variant="ghost"
                  onClick={() =>
                    navigate(routes.space.toSettings(orgSlug, space.slug))
                  }
                  data-testid={SidebarNavigationDataTestId.SpaceSettingsLink}
                >
                  <LuSlidersHorizontal />
                </PMIconButton>
              </PMBox>
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
