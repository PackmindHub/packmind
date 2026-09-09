import { Link } from 'react-router';
import { PMBox, PMIcon, PMVStack } from '@packmind/ui';
import { LuChevronLeft } from 'react-icons/lu';
import type { SkillFile, SkillId } from '@packmind/types';
import { SkillFilePreview } from '../../../skills/components/SkillFilePreview';
import { useGetSkillWithFilesByIdQuery } from '../../../skills/api/queries/SkillsQueries';
import { useCanEditSkillFiles } from '../../../skills/hooks/useCanEditSkillFiles';

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
 * Editable, which it was not at first. It was read-only because the permission
 * check lived on the skill's own page and so did the way to it; then that page
 * stopped being reachable in the plugin-first navigation and read-only became
 * "a skill cannot be edited". `useCanEditSkillFiles` is the check, asked here
 * rather than copied, and the preview has carried the pencil all along.
 *
 * The skill is queried here rather than threaded down from the surface. Two
 * panes render this and both would have to carry three props they have no other
 * use for, and React Query answers from the same cache entry the surface and
 * the instructions body already read.
 */
export function ContextSkillFileDetail({
  file,
  skillId,
  skillName,
  backHref,
}: Readonly<{
  file: SkillFile;
  /** The skill the file belongs to, which is what says who may edit it. */
  skillId: SkillId;
  skillName: string;
  /** The skill's instructions, which is what a file is read beside. */
  backHref: string;
}>) {
  const { data } = useGetSkillWithFilesByIdQuery(skillId);
  const canEdit = useCanEditSkillFiles(data?.skill);

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
        <SkillFilePreview
          file={file}
          skillId={skillId}
          skillSlug={data?.skill.slug}
          skillVersion={data?.latestVersion.version}
          canEdit={canEdit}
        />
      </PMVStack>
    </PMBox>
  );
}
