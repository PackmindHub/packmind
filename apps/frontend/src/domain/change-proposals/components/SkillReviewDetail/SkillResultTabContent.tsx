import { useCallback, useMemo } from 'react';
import { PMBox, PMMarkdownViewer, PMText, PMVStack } from '@packmind/ui';
import {
  ChangeProposalId,
  ChangeProposalType,
  Skill,
  SkillFile,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { applySkillProposals } from '../../utils/applySkillProposals';
import { PREVIEW_SKILL_VERSION_ID } from '../../utils/changeProposalHelpers';
import { SKILL_MD_PATH } from '../../utils/groupSkillProposalsByFile';
import { serializeSkillToMarkdown } from '../../utils/serializeArtifactToMarkdown';
import { SkillFrontmatterInfo } from '../../../skills/components/SkillFrontmatterInfo';
import { SkillFilePreview } from '../../../skills/components/SkillFilePreview';
import { ArtifactResultFilePreview } from '../shared/ArtifactResultFilePreview';

interface SkillResultTabContentProps {
  skill: Skill;
  files: SkillFile[];
  proposals: ChangeProposalWithConflicts[];
  acceptedProposalIds: Set<ChangeProposalId>;
  filePathFilter?: string;
}

function filterFiles(files: SkillFile[], filter: string): SkillFile[] {
  return files.filter(
    (f) => f.path === filter || f.path.startsWith(filter + '/'),
  );
}

export function SkillResultTabContent({
  skill,
  files,
  proposals,
  acceptedProposalIds,
  filePathFilter = '',
}: Readonly<SkillResultTabContentProps>) {
  const applied = useMemo(
    () => applySkillProposals(skill, files, proposals, acceptedProposalIds),
    [skill, files, proposals, acceptedProposalIds],
  );

  const hasAccepted = acceptedProposalIds.size > 0;

  const hasAcceptedRemoval = proposals.some(
    (p) =>
      acceptedProposalIds.has(p.id) &&
      p.type === ChangeProposalType.removeSkill,
  );

  const getPreviewCommand = useCallback(
    () => ({
      recipeVersions: [],
      standardVersions: [],
      skillVersions: [
        {
          id: PREVIEW_SKILL_VERSION_ID,
          skillId: skill.id,
          version: skill.version,
          userId: skill.userId,
          name: applied.name,
          slug: skill.slug,
          description: applied.description,
          prompt: applied.prompt,
          license: applied.license,
          compatibility: applied.compatibility,
          metadata: applied.metadata,
          allowedTools: applied.allowedTools,
          files: applied.files,
        },
      ],
    }),
    [applied, skill],
  );

  const showScalarFields = !filePathFilter || filePathFilter === SKILL_MD_PATH;
  const showFiles = !filePathFilter || filePathFilter !== SKILL_MD_PATH;

  const sortedFiles = useMemo(() => {
    const filtered =
      filePathFilter && filePathFilter !== SKILL_MD_PATH
        ? filterFiles(applied.files, filePathFilter)
        : applied.files;
    return [...filtered].sort((a, b) => a.path.localeCompare(b.path));
  }, [applied.files, filePathFilter]);

  const markdown = useMemo(() => serializeSkillToMarkdown(applied), [applied]);

  const skillMdPreview = (
    <PMVStack align="stretch" gap={4}>
      <SkillFrontmatterInfo skillVersion={applied} />
      <PMBox
        border="solid 1px"
        borderColor="border.primary"
        borderRadius="md"
        padding={4}
        backgroundColor="background.primary"
      >
        <PMMarkdownViewer content={applied.prompt} />
      </PMBox>
    </PMVStack>
  );

  return (
    <PMBox p={6}>
      <PMText
        fontSize="2xs"
        fontWeight="medium"
        textTransform="uppercase"
        color="faded"
        mb={6}
      >
        Version with accepted changes
      </PMText>

      {hasAccepted ? (
        <PMVStack gap={6} align="stretch">
          {showScalarFields && (
            <ArtifactResultFilePreview
              fileName={SKILL_MD_PATH}
              markdown={markdown}
              previewContent={skillMdPreview}
              hideActions={hasAcceptedRemoval}
              getPreviewCommand={getPreviewCommand}
            />
          )}

          {showFiles && sortedFiles.length > 0 && (
            <PMVStack gap={4} align="stretch">
              <PMText fontSize="md" fontWeight="semibold">
                Files
              </PMText>
              {sortedFiles.map((file) => (
                <PMBox
                  key={file.id}
                  border="solid 1px"
                  borderColor="border.tertiary"
                  borderRadius="md"
                  p={4}
                >
                  <SkillFilePreview file={file} />
                </PMBox>
              ))}
            </PMVStack>
          )}
        </PMVStack>
      ) : (
        <PMBox py={12} textAlign="center">
          <PMText color="faded" fontStyle="italic">
            No accepted changes yet
          </PMText>
        </PMBox>
      )}
    </PMBox>
  );
}
