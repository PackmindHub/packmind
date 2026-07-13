import { useCallback, useMemo, type MouseEvent } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router';
import { PMVStack } from '@packmind/ui';
import { createSkillFileId, SkillFile } from '@packmind/types';

import { SkillFilePreview } from '../../src/domain/skills/components/SkillFilePreview';
import { SkillFrontmatterInfo } from '../../src/domain/skills/components/SkillFrontmatterInfo';
import { buildSkillMdContent } from '../../src/domain/skills/utils/skillMdUtils';
import { buildSkillLinkTransformer } from '../../src/domain/skills/utils/skillLinkUtils';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { useGetSpaceMembersQuery } from '../../src/domain/spaces/api/queries/SpacesQueries';
import type { ISkillDetailsOutletContext } from './org.$orgSlug._protected.space.$spaceSlug._space-protected.skills.$skillSlug';

const SKILL_MD_FILENAME = 'SKILL.md';

export default function SkillFilesRouteModule() {
  const {
    '*': filePath,
    orgSlug,
    spaceSlug,
    skillSlug,
  } = useParams<{
    '*': string;
    orgSlug: string;
    spaceSlug: string;
    skillSlug: string;
  }>();
  const navigate = useNavigate();
  const { skill, files, latestVersion } =
    useOutletContext<ISkillDetailsOutletContext>();
  const { user, organization } = useAuthContext();
  const { data: spaceMembersData } = useGetSpaceMembersQuery(skill.spaceId);

  // Client-side gate for UX only — mirrors UpdateSkillFileFromUIUseCase's
  // permission check (space admin, org admin, or the skill's creator). The
  // server remains the source of truth and returns 403 if this is ever wrong.
  const currentUserMember = spaceMembersData?.members?.find(
    (member) => member.userId === user?.id,
  );
  const isSpaceAdmin = currentUserMember?.role === 'admin';
  const isOrgAdmin = organization?.role === 'admin';
  const isCreator = skill.userId === user?.id;
  const canEditSkillFiles = isSpaceAdmin || isOrgAdmin || isCreator;

  // Create virtual SKILL.md file (content is body only — frontmatter is shown separately)
  const skillMdFile = useMemo<SkillFile>(
    () => ({
      id: createSkillFileId(''),
      skillVersionId: latestVersion.id,
      permissions: '',
      path: SKILL_MD_FILENAME,
      content: latestVersion.prompt,
      isBase64: false,
    }),
    [latestVersion],
  );

  // Full SKILL.md content (frontmatter + body) used for clipboard only
  const skillMdClipboardContent = useMemo(
    () => buildSkillMdContent(latestVersion),
    [latestVersion],
  );

  // Determine selected file path, default to SKILL.md
  const selectedFilePath = filePath || SKILL_MD_FILENAME;

  // Find the selected file
  const selectedFile = useMemo(() => {
    if (!selectedFilePath || selectedFilePath === SKILL_MD_FILENAME) {
      return skillMdFile;
    }
    return files.find((f) => f.path === selectedFilePath) ?? skillMdFile;
  }, [selectedFilePath, files, skillMdFile]);

  const showDescriptionBox = selectedFile?.path === SKILL_MD_FILENAME;

  const transformLinkUri = useMemo(
    () =>
      buildSkillLinkTransformer({
        orgSlug,
        spaceSlug,
        skillSlug,
        currentFilePath: selectedFile?.path ?? SKILL_MD_FILENAME,
      }),
    [orgSlug, spaceSlug, skillSlug, selectedFile?.path],
  );

  const skillFilesPathPrefix =
    orgSlug && spaceSlug && skillSlug
      ? `/org/${orgSlug}/space/${spaceSlug}/skills/${skillSlug}/files/`
      : null;

  const handleLinkClick = useCallback(
    (href: string, event: MouseEvent<HTMLAnchorElement>) => {
      if (!skillFilesPathPrefix) return;
      if (!href.startsWith(skillFilesPathPrefix)) return;
      event.preventDefault();
      navigate(href, { replace: true });
    },
    [navigate, skillFilesPathPrefix],
  );

  return (
    <div>
      <PMVStack align="stretch" gap={6}>
        {showDescriptionBox && (
          <SkillFrontmatterInfo skillVersion={latestVersion} />
        )}
        <PMVStack
          align="stretch"
          gap={6}
          border="solid 1px"
          borderColor="border.tertiary"
          borderRadius="md"
          p={4}
          overflow="hidden"
        >
          <SkillFilePreview
            file={selectedFile}
            clipboardContent={
              selectedFile?.path === SKILL_MD_FILENAME
                ? skillMdClipboardContent
                : undefined
            }
            transformLinkUri={transformLinkUri}
            onLinkClick={handleLinkClick}
            skillId={skill.id}
            skillSlug={skill.slug}
            skillVersion={latestVersion.version}
            canEdit={canEditSkillFiles}
          />
        </PMVStack>
      </PMVStack>
    </div>
  );
}
