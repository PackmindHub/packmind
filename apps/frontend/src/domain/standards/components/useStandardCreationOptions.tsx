import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  PMButton,
  PMCloseButton,
  PMDialog,
  PMHStack,
  PMHeading,
  PMIcon,
  PMMenu,
  PMPortal,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuBot, LuLibrary, LuPencilLine } from 'react-icons/lu';
import type { PackageId } from '@packmind/types';
import { GETTING_STARTED_CREATE_STANDARD_DIALOG } from '../../organizations/components/dashboard/GettingStartedWidget';
import { StandardSamplesModal } from './StandardSamplesModal';
import { routes } from '../../../shared/utils/routes';
import { withPackageParam } from '../../deployments/hooks/useCreateIntoPackage';
import { useAnalytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';

/**
 * The ways to create a standard, as menu items plus the surfaces they open.
 *
 * Two nodes rather than one because of where each has to be rendered: the items
 * belong inside a menu's content, and the dialogs must not, or closing the menu
 * on click would take the dialog down with it. The state that connects them
 * lives here, which is the reason this is a hook and not a component.
 *
 * It exists so the standards page and the Context surface offer the same ways
 * of creating, described in the same words. Two lists would drift the day a
 * fourth way appears, and the copy is the part users learn.
 */
export function useStandardCreationOptions({
  orgSlug,
  spaceSlug,
  packageId,
}: Readonly<{
  orgSlug: string;
  spaceSlug: string;
  /** When set, a standard created from the form joins this package. */
  packageId?: PackageId;
}>): {
  items: ReactNode;
  dialogs: ReactNode;
} {
  const [isSamplesModalOpen, setIsSamplesModalOpen] = useState(false);
  const [isFromCodeDialogOpen, setIsFromCodeDialogOpen] = useState(false);
  const analytics = useAnalytics();

  const items = (
    <>
      <PMMenu.Item
        value="standard-samples"
        onClick={() => {
          analytics.track('create_standard_from_samples_clicked', {});
          setIsSamplesModalOpen(true);
        }}
        p={3}
      >
        <PMVStack alignItems={'flex-start'} gap={0} cursor={'pointer'}>
          <PMHStack gap={2} mb={1}>
            <PMIcon color="yellow.200" size="lg">
              <LuLibrary />
            </PMIcon>
            <PMText fontWeight="semibold" fontSize="sm">
              From samples
            </PMText>
          </PMHStack>
          <PMText fontSize="xs" color="secondary">
            Add proven standards for common stacks
          </PMText>
        </PMVStack>
      </PMMenu.Item>
      <PMMenu.Item
        value="standard-from-code"
        p={3}
        onClick={() => {
          setIsFromCodeDialogOpen(true);
        }}
      >
        <PMVStack alignItems={'flex-start'} gap={0} cursor={'pointer'}>
          <PMHStack gap={2} mb={1}>
            <PMIcon color="branding.primary" size="lg">
              <LuBot />
            </PMIcon>
            <PMText fontWeight="semibold" fontSize="sm">
              From my code
            </PMText>
          </PMHStack>
          <PMText fontSize="xs" color="secondary">
            Configure your agent to create standards from your codebase
          </PMText>
        </PMVStack>
      </PMMenu.Item>
      <PMMenu.Item value="standard-blank" p={3} asChild cursor={'pointer'}>
        <Link
          to={withPackageParam(
            routes.space.toCreateStandard(orgSlug, spaceSlug),
            packageId,
          )}
        >
          <PMVStack alignItems={'flex-start'} gap={0}>
            <PMHStack gap={2} mb={1}>
              <PMIcon color="beige.200" size="lg">
                <LuPencilLine />
              </PMIcon>
              <PMText fontWeight="semibold" fontSize="sm">
                Manually
              </PMText>
            </PMHStack>
            <PMText fontSize="xs" color="secondary">
              {packageId
                ? 'Build a custom standard, added to this package'
                : 'Build a custom standard manually'}
            </PMText>
          </PMVStack>
        </Link>
      </PMMenu.Item>
    </>
  );

  const dialogs = (
    <>
      <StandardSamplesModal
        open={isSamplesModalOpen}
        onOpenChange={setIsSamplesModalOpen}
      />
      <PMDialog.Root
        open={isFromCodeDialogOpen}
        onOpenChange={(e) => setIsFromCodeDialogOpen(e.open)}
        size="xl"
        placement="center"
        motionPreset="slide-in-bottom"
        scrollBehavior={'inside'}
      >
        <PMPortal>
          <PMDialog.Backdrop />
          <PMDialog.Positioner>
            <PMDialog.Content>
              <PMDialog.Header>
                <PMDialog.Title asChild>
                  <PMHeading level="h3">
                    {GETTING_STARTED_CREATE_STANDARD_DIALOG.title}
                  </PMHeading>
                </PMDialog.Title>
                <PMDialog.CloseTrigger asChild>
                  <PMCloseButton size="sm" />
                </PMDialog.CloseTrigger>
              </PMDialog.Header>
              <PMDialog.Body>
                {GETTING_STARTED_CREATE_STANDARD_DIALOG.body}
              </PMDialog.Body>
              <PMDialog.Footer>
                <PMButton
                  variant="tertiary"
                  size="md"
                  onClick={() => setIsFromCodeDialogOpen(false)}
                >
                  Close
                </PMButton>
              </PMDialog.Footer>
            </PMDialog.Content>
          </PMDialog.Positioner>
        </PMPortal>
      </PMDialog.Root>
    </>
  );

  return { items, dialogs };
}
