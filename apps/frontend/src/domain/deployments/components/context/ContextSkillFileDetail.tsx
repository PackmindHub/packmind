import { Link } from 'react-router';
import { PMBox, PMIcon, PMVStack } from '@packmind/ui';
import { LuChevronLeft } from 'react-icons/lu';
import type { SkillFile } from '@packmind/types';
import { SkillFilePreview } from '../../../skills/components/SkillFilePreview';

/**
 * One file of a skill, read in the pane the skill was read in.
 *
 * The preview is the skill page's own: it already knows the difference between
 * markdown, code and a file that cannot be shown at all, and it carries the
 * download and copy actions for each. Reading a file is the same act on both
 * surfaces, so it is the same component.
 *
 * No heading of its own above it. The preview names the file, in the path it is
 * reached by, and a second larger copy of the same path is what that would be.
 *
 * Read-only here: the edit button belongs to a permission check the pane does
 * not run, and the way to it is the skill's own page.
 */
export function ContextSkillFileDetail({
  file,
  skillName,
  backHref,
}: Readonly<{
  file: SkillFile;
  skillName: string;
  /** The skill's instructions, which is what a file is read beside. */
  backHref: string;
}>) {
  return (
    <PMBox padding={6}>
      <PMBox
        display="inline-flex"
        alignItems="center"
        gap="4px"
        fontSize="sm"
        color="text.faded"
        _hover={{ color: 'text.primary' }}
        transition="color 150ms ease-out"
        asChild
      >
        <Link to={backHref}>
          <PMIcon fontSize="sm">
            <LuChevronLeft />
          </PMIcon>
          {skillName}
        </Link>
      </PMBox>

      {/*
        Full width, unlike every other body of this pane: those are prose and
        prose has a comfortable measure, but a file is as wide as its longest
        line, and wrapping code to read like a paragraph is worse than scrolling
        it. The same width the skill's own page gives it.
      */}
      <PMVStack
        align="stretch"
        width="full"
        gap={6}
        marginTop={4}
        borderWidth="1px"
        borderColor="border.tertiary"
        borderRadius="md"
        padding={4}
      >
        <SkillFilePreview file={file} />
      </PMVStack>
    </PMBox>
  );
}
