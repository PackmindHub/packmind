import { useState } from 'react';
import { Link } from 'react-router';
import {
  PMButton,
  PMMenu,
  PMPortal,
  PMText,
  PMHStack,
  PMIcon,
  PMVStack,
  PMDialog,
  PMHeading,
  PMCloseButton,
} from '@packmind/ui';
import { LuBot, LuLibrary, LuPencilLine } from 'react-icons/lu';
import { GETTING_STARTED_CREATE_DIALOG } from '../../organizations/components/dashboard/GettingStartedWidget';
import { StandardSamplesModal } from './StandardSamplesModal';
import { routes } from '../../../shared/utils/routes';
import { useAnalytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';

interface StandardsCreateButtonProps {
  orgSlug: string;
  spaceSlug: string;
}

export const StandardsCreateButton = ({
  orgSlug,
  spaceSlug,
}: StandardsCreateButtonProps) => {
  const [isSamplesModalOpen, setIsSamplesModalOpen] = useState(false);
  const [isFromCodeDialogOpen, setIsFromCodeDialogOpen] = useState(false);
  const analytics = useAnalytics();

  return (
    <>
      <PMMenu.Root>
        <PMMenu.Trigger asChild>
          <PMButton>Create</PMButton>
        </PMMenu.Trigger>
        <PMPortal>
          <PMMenu.Positioner>
            <PMMenu.Content minW="350px">
              <PMMenu.Item
                value="samples"
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
                value="from-code"
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
              <PMMenu.Item value="blank" p={3} asChild cursor={'pointer'}>
                <Link to={routes.space.toCreateStandard(orgSlug, spaceSlug)}>
                  <PMVStack alignItems={'flex-start'} gap={0}>
                    <PMHStack gap={2} mb={1}>
                      <PMIcon color="beige.200" size="lg">
                        <LuPencilLine />
                      </PMIcon>
                      <PMText fontWeight="semibold" fontSize="sm">
                        From Scratch
                      </PMText>
                    </PMHStack>
                    <PMText fontSize="xs" color="secondary">
                      Build a custom standard manually
                    </PMText>
                  </PMVStack>
                </Link>
              </PMMenu.Item>
            </PMMenu.Content>
          </PMMenu.Positioner>
        </PMPortal>
      </PMMenu.Root>
      <StandardSamplesModal
        open={isSamplesModalOpen}
        onOpenChange={setIsSamplesModalOpen}
      />
      <PMDialog.Root
        open={isFromCodeDialogOpen}
        onOpenChange={(e) => setIsFromCodeDialogOpen(e.open)}
        size="lg"
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
                    {GETTING_STARTED_CREATE_DIALOG.title}
                  </PMHeading>
                </PMDialog.Title>
                <PMDialog.CloseTrigger asChild>
                  <PMCloseButton size="sm" />
                </PMDialog.CloseTrigger>
              </PMDialog.Header>
              <PMDialog.Body>
                {GETTING_STARTED_CREATE_DIALOG.body}
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
};
