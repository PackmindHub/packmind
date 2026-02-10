import { useState } from 'react';
import {
  PMButton,
  PMCloseButton,
  PMDialog,
  PMHeading,
  PMHStack,
  PMIcon,
  PMMenu,
  PMPortal,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuBot, LuUpload } from 'react-icons/lu';
import { SkillsLearnMoreContent } from './SkillsLearnMoreContent';
import { SkillsImportContent } from './SkillsImportContent';

interface SkillsCreateButtonProps {
  spaceSlug: string;
}

export const SkillsCreateButton = ({ spaceSlug }: SkillsCreateButtonProps) => {
  const [isFromCodeDialogOpen, setIsFromCodeDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  if (!spaceSlug) {
    return null;
  }

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
                value="from-code"
                p={3}
                onClick={() => setIsFromCodeDialogOpen(true)}
              >
                <PMVStack alignItems={'flex-start'} gap={0} cursor={'pointer'}>
                  <PMHStack gap={2} mb={1}>
                    <PMIcon color="branding.primary" size="lg">
                      <LuBot />
                    </PMIcon>
                    <PMText fontWeight="semibold" fontSize="sm">
                      Create from your code
                    </PMText>
                  </PMHStack>
                  <PMText fontSize="xs" color="secondary">
                    Let your agent create skills from your codebase
                  </PMText>
                </PMVStack>
              </PMMenu.Item>
              <PMMenu.Item
                value="import"
                p={3}
                onClick={() => setIsImportDialogOpen(true)}
              >
                <PMVStack alignItems={'flex-start'} gap={0} cursor={'pointer'}>
                  <PMHStack gap={2} mb={1}>
                    <PMIcon color="yellow.100" size="lg">
                      <LuUpload />
                    </PMIcon>
                    <PMText fontWeight="semibold" fontSize="sm">
                      Import skills
                    </PMText>
                  </PMHStack>
                  <PMText fontSize="xs" color="secondary">
                    Import skills into your project via CLI
                  </PMText>
                </PMVStack>
              </PMMenu.Item>
            </PMMenu.Content>
          </PMMenu.Positioner>
        </PMPortal>
      </PMMenu.Root>

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
                  <PMHeading level="h3">How to create skills</PMHeading>
                </PMDialog.Title>
                <PMDialog.CloseTrigger asChild>
                  <PMCloseButton size="sm" />
                </PMDialog.CloseTrigger>
              </PMDialog.Header>
              <PMDialog.Body>
                <SkillsLearnMoreContent />
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

      <PMDialog.Root
        open={isImportDialogOpen}
        onOpenChange={(e) => setIsImportDialogOpen(e.open)}
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
                  <PMHeading level="h3">How to import skills</PMHeading>
                </PMDialog.Title>
                <PMDialog.CloseTrigger asChild>
                  <PMCloseButton size="sm" />
                </PMDialog.CloseTrigger>
              </PMDialog.Header>
              <PMDialog.Body>
                <SkillsImportContent />
              </PMDialog.Body>
              <PMDialog.Footer>
                <PMButton
                  variant="tertiary"
                  size="md"
                  onClick={() => setIsImportDialogOpen(false)}
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
