import { useState, type ReactNode } from 'react';
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
import { LuBot, LuUpload } from 'react-icons/lu';
import { SkillsLearnMoreContent } from './SkillsLearnMoreContent';
import { SkillsImportContent } from './SkillsImportContent';

/**
 * The ways to create a skill, as menu items plus the surfaces they open. See
 * `useStandardCreationOptions` for why the two travel separately.
 *
 * Neither of them is a form: a skill is a folder of files, so it arrives from an
 * agent or from an upload rather than from a page with fields. Both items open a
 * dialog that says how. That is worth listing next to the other types rather
 * than omitting, since "can I make one of these" is the question the menu
 * answers, and the answer for skills is yes, by another route.
 */
export function useSkillCreationOptions(): {
  items: ReactNode;
  dialogs: ReactNode;
} {
  const [isFromCodeDialogOpen, setIsFromCodeDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const items = (
    <>
      <PMMenu.Item
        value="skill-from-code"
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
        value="skill-import"
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
            Upload a folder of skills, or import them with the CLI
          </PMText>
        </PMVStack>
      </PMMenu.Item>
    </>
  );

  const dialogs = (
    <>
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

  return { items, dialogs };
}
