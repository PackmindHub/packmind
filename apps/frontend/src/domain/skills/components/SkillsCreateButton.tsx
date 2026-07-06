import { useState } from 'react';
import {
  PMBox,
  PMButton,
  PMCloseButton,
  PMDrawer,
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

      <PMDrawer.Root
        open={isFromCodeDialogOpen}
        onOpenChange={(e) => setIsFromCodeDialogOpen(e.open)}
        placement="end"
        size="md"
      >
        <PMPortal>
          <PMDrawer.Backdrop />
          <PMDrawer.Positioner>
            <PMDrawer.Content>
              <PMDrawer.Header
                borderBottom="1px solid"
                borderColor="border.tertiary"
              >
                <PMDrawer.Title>How to create skills</PMDrawer.Title>
                <PMDrawer.CloseTrigger asChild>
                  <PMCloseButton size="sm" />
                </PMDrawer.CloseTrigger>
              </PMDrawer.Header>
              <PMDrawer.Body>
                <SkillsLearnMoreContent />
              </PMDrawer.Body>
              <PMBox
                borderTop="1px solid"
                borderColor="border.tertiary"
                paddingX={5}
                paddingY={3}
              >
                <PMHStack justify="flex-end">
                  <PMButton
                    variant="tertiary"
                    size="sm"
                    onClick={() => setIsFromCodeDialogOpen(false)}
                  >
                    Close
                  </PMButton>
                </PMHStack>
              </PMBox>
            </PMDrawer.Content>
          </PMDrawer.Positioner>
        </PMPortal>
      </PMDrawer.Root>

      <PMDrawer.Root
        open={isImportDialogOpen}
        onOpenChange={(e) => setIsImportDialogOpen(e.open)}
        placement="end"
        size="md"
      >
        <PMPortal>
          <PMDrawer.Backdrop />
          <PMDrawer.Positioner>
            <PMDrawer.Content>
              <PMDrawer.Header
                borderBottom="1px solid"
                borderColor="border.tertiary"
              >
                <PMDrawer.Title>How to import skills</PMDrawer.Title>
                <PMDrawer.CloseTrigger asChild>
                  <PMCloseButton size="sm" />
                </PMDrawer.CloseTrigger>
              </PMDrawer.Header>
              <PMDrawer.Body>
                <SkillsImportContent />
              </PMDrawer.Body>
              <PMBox
                borderTop="1px solid"
                borderColor="border.tertiary"
                paddingX={5}
                paddingY={3}
              >
                <PMHStack justify="flex-end">
                  <PMButton
                    variant="tertiary"
                    size="sm"
                    onClick={() => setIsImportDialogOpen(false)}
                  >
                    Close
                  </PMButton>
                </PMHStack>
              </PMBox>
            </PMDrawer.Content>
          </PMDrawer.Positioner>
        </PMPortal>
      </PMDrawer.Root>
    </>
  );
};
