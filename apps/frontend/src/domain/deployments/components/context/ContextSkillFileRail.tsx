import { Link } from 'react-router';
import { PMBox, PMIcon, PMText, PMVStack } from '@packmind/ui';
import { LuChevronLeft } from 'react-icons/lu';
import type { SkillFile } from '@packmind/types';
import { SkillFileTree } from '../../../skills/components/SkillFileTree';

/**
 * The files of the open skill, in the place the packages were.
 *
 * Two navigation columns at every depth, never three. A skill is a folder and a
 * folder needs an index, but the rail is already the index of this surface: so
 * it becomes the skill's, and its header is what says what was left behind and
 * how to get back to it.
 *
 * Replacing the rail rather than adding a column is also what keeps the pane the
 * width it was. A third column would have taken it from the only part of the
 * screen that shows the file itself.
 *
 * The tree is the skill page's own, so the rows navigate by callback rather than
 * by link: no cmd-click, which the page has never had either. The address still
 * changes, so the file that is open is still the file that gets pasted.
 */
export function ContextSkillFileRail({
  skillName,
  packageName,
  backHref,
  files,
  selectedPath,
  onSelectFile,
}: Readonly<{
  skillName: string;
  /** Named on the way back, because that is the information, not "Back". */
  packageName: string;
  /** The package this skill was opened from, tab and all. */
  backHref: string;
  /** SKILL.md included: the tree pins it above the rest, as its entry point. */
  files: readonly SkillFile[];
  /** SKILL.md when no file is open, which is what the pane is showing then. */
  selectedPath: string;
  onSelectFile: (path: string) => void;
}>) {
  return (
    <PMBox
      // The width of the rail it stands in for, to the pixel. A column that
      // resized when a skill was opened would read as a different screen.
      width="320px"
      flexShrink={0}
      bg="background.primary"
      borderRightWidth="1px"
      borderColor="border.tertiary"
      display="flex"
      flexDirection="column"
      minH={0}
    >
      {/* The same band as the package rail's search: one anatomy per rail. */}
      <PMBox
        paddingX={3}
        paddingY={3}
        borderBottomWidth="1px"
        borderColor="border.tertiary"
        flexShrink={0}
      >
        <PMBox
          display="inline-flex"
          alignItems="center"
          gap="4px"
          fontSize="xs"
          color="text.faded"
          _hover={{ color: 'text.primary' }}
          transition="color 150ms ease-out"
          asChild
        >
          <Link to={backHref}>
            <PMIcon fontSize="xs">
              <LuChevronLeft />
            </PMIcon>
            {packageName}
          </Link>
        </PMBox>
        <PMText as="div" fontSize="sm" fontWeight="semibold" paddingTop={1}>
          {skillName}
        </PMText>
        <PMText as="div" fontSize="xs" color="faded">
          {`${files.length} file${files.length === 1 ? '' : 's'}`}
        </PMText>
      </PMBox>

      <PMVStack align="stretch" flex="1" minH={0} paddingX={2} paddingY={2}>
        <SkillFileTree
          files={[...files]}
          selectedFilePath={selectedPath}
          onFileSelect={onSelectFile}
        />
      </PMVStack>
    </PMBox>
  );
}
