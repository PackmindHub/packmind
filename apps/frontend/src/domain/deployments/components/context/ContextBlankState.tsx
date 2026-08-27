import { PMBox, PMButton, PMIcon, PMText } from '@packmind/ui';
import { LuPlus } from 'react-icons/lu';

/**
 * A space with no package, which is this surface with nothing to show: the rail
 * lists packages and the pane reads one, so there is no half of it that works
 * yet.
 *
 * Its own state rather than the packages page's, which this surface borrowed
 * until now. Two reasons, and neither is the copy. The page's block is a pitch
 * for the idea of a package, written for a listing a reader arrives at from
 * outside; this is the screen they will do the work on, and it owes them the
 * next gesture, not the argument. And the page belongs to the navigation being
 * replaced: teaching its component a second shape so that this one could open a
 * drawer put a prop on the old navigation's screen to serve the new one.
 *
 * Same box as the empty states inside the pane, because it is the same kind of
 * sentence: what is missing, why it matters, and the control that fixes it.
 */
export function ContextBlankState({
  onCreate,
}: Readonly<{ onCreate: () => void }>) {
  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      backgroundColor="background.primary"
      padding={6}
      maxWidth="68ch"
    >
      <PMText as="div" fontWeight="medium">
        This space has no package.
      </PMText>
      <PMText as="div" color="secondary" paddingTop={1}>
        A package is what a coding agent reads: the standards, commands and
        skills that reach a repository together. Nothing here can be read or
        distributed until there is one.
      </PMText>
      <PMBox paddingTop={4}>
        <PMButton variant="primary" size="sm" onClick={onCreate}>
          <PMIcon fontSize="xs">
            <LuPlus />
          </PMIcon>
          New package
        </PMButton>
      </PMBox>
    </PMBox>
  );
}
