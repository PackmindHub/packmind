import {
  PMBox,
  PMButton,
  PMHeading,
  PMIcon,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuPackage, LuPlus } from 'react-icons/lu';

/**
 * A space with no package and nothing to put in one, which is this surface with
 * nothing to show: the rail lists packages and the pane reads one, so there is
 * no half of it that works yet.
 *
 * Its own state rather than the packages page's, which this surface borrowed
 * until now. Two reasons, and neither is the copy. The page's block is a pitch
 * for the idea of a package, written for a listing a reader arrives at from
 * outside; this is the screen they will do the work on, and it owes them the
 * next gesture, not the argument. And the page belongs to the navigation being
 * replaced: teaching its component a second shape so that this one could open a
 * drawer put a prop on the old navigation's screen to serve the new one.
 *
 * It owns the whole surface rather than sitting in a card at the top of it. The
 * first version reused the box the pane's own empty states use — a bordered
 * panel capped at 68ch — and dropped it into a full-bleed area that has no
 * page padding, so it landed against the top-left corner with the window empty
 * around it. A panel drawn where there is no panel, and small enough to read as
 * a fragment of a screen that failed to load rather than as the state of the
 * space. Here the empty room is the composition: centred, unbordered, one
 * statement and the control that ends it.
 *
 * The rail is deliberately not beside it — the surface returns this in place of
 * itself. With no package and no component the rail would be a search over
 * nothing, a row reading zero and an empty list: three pieces of chrome saying
 * less than the sentence below says.
 */
export function ContextBlankState({
  onCreate,
}: Readonly<{ onCreate: () => void }>) {
  return (
    <PMVStack
      flex="1"
      minH={0}
      justify="center"
      align="center"
      gap={0}
      paddingX={6}
      /*
       * Centred, then lifted off the true centre. The eye reads the middle of
       * the words as the middle of the block, and the button underneath is not
       * words, so on a tall window a mathematically centred composition sits
       * visibly low.
       */
      paddingBottom={12}
      bg="background.primary"
    >
      {/*
        The object being named rather than an ornament above it: this is the
        same crate the rail puts on every package row, so the first mark on the
        screen is the thing the button at the bottom of it makes.
      */}
      <PMBox
        width="40px"
        height="40px"
        borderRadius="md"
        bg="background.tertiary"
        color="text.tertiary"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <PMIcon fontSize="lg">
          <LuPackage />
        </PMIcon>
      </PMBox>

      {/*
        A real heading, and the only one on the screen. The first version said
        this in medium-weight body text, which is why nothing on the page
        anchored the eye and why the state had no entry in the document outline
        at all.
      */}
      <PMHeading
        level="h2"
        textAlign="center"
        paddingTop={5}
        /*
         * The h2 step carries a 48px line, which is right for the section
         * headings it was cut for and very loose for two lines of six words.
         * Balanced wrapping is what keeps it from splitting one word onto a
         * line of its own at the narrow end.
         */
        textWrap="balance"
      >
        This space has no package yet
      </PMHeading>

      {/*
        Capped well inside the 65-75ch reading measure. Centred text is taken in
        at a glance rather than scanned line by line, and it only reads that way
        while the lines are short enough that the eye does not have to hunt for
        the start of the next one.
      */}
      <PMText
        as="div"
        color="secondary"
        textAlign="center"
        maxWidth="46ch"
        lineHeight={1.6}
        paddingTop={2}
        textWrap="pretty"
      >
        A package is what a coding agent reads: the standards, commands and
        skills that reach a repository together. Nothing here is created or
        distributed until one exists.
      </PMText>

      <PMBox paddingTop={6}>
        <PMButton variant="primary" onClick={onCreate}>
          <PMIcon fontSize="xs">
            <LuPlus />
          </PMIcon>
          New package
        </PMButton>
      </PMBox>
    </PMVStack>
  );
}
