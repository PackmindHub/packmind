import { useState } from 'react';
import { Link } from 'react-router';
import {
  PMButton,
  PMMenu,
  PMPopover,
  PMPortal,
  PMText,
  PMHStack,
  PMIcon,
  PMVStack,
  PMHeading,
} from '@packmind/ui';
import { LuBot, LuLibrary, LuPencilLine } from 'react-icons/lu';
import { GETTING_STARTED_CREATE_STANDARD_DIALOG } from '../../organizations/components/dashboard/GettingStartedWidget';
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
      <PMPopover.Root
        open={isFromCodeDialogOpen}
        onOpenChange={(e) => setIsFromCodeDialogOpen(e.open)}
        positioning={{ placement: 'bottom-end' }}
      >
        <PMMenu.Root>
          <PMPopover.Anchor>
            <PMMenu.Trigger asChild>
              <PMButton>Create</PMButton>
            </PMMenu.Trigger>
          </PMPopover.Anchor>
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
                          Manually
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
        <PMPortal>
          <PMPopover.Positioner>
            <PMPopover.Content width="480px" maxWidth="90vw">
              <PMPopover.Arrow>
                <PMPopover.ArrowTip />
              </PMPopover.Arrow>
              <PMPopover.Body>
                <PMPopover.Title asChild>
                  <PMHeading level="h4">
                    {GETTING_STARTED_CREATE_STANDARD_DIALOG.title}
                  </PMHeading>
                </PMPopover.Title>
                <PMVStack align="stretch" gap={4} mt={4}>
                  {GETTING_STARTED_CREATE_STANDARD_DIALOG.body}
                  <PMHStack justify="flex-end">
                    <PMButton
                      variant="tertiary"
                      size="sm"
                      onClick={() => setIsFromCodeDialogOpen(false)}
                    >
                      Close
                    </PMButton>
                  </PMHStack>
                </PMVStack>
              </PMPopover.Body>
            </PMPopover.Content>
          </PMPopover.Positioner>
        </PMPortal>
      </PMPopover.Root>
      <StandardSamplesModal
        open={isSamplesModalOpen}
        onOpenChange={setIsSamplesModalOpen}
      />
    </>
  );
};
