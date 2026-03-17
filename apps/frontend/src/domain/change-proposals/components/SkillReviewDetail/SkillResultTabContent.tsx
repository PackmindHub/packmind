import { useCallback, useMemo } from 'react';
import {
  PMBox,
  PMHeading,
  PMHStack,
  PMMarkdownViewer,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { ChangeProposalId, Skill, SkillFile } from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { applySkillProposals } from '../../utils/applySkillProposals';
import { PREVIEW_SKILL_VERSION_ID } from '../../utils/changeProposalHelpers';
import { DownloadAsAgentButton } from '../shared/DownloadAsAgentButton';
import { SKILL_MD_PATH } from '../../utils/groupSkillProposalsByFile';
import { SkillOptionalField } from './SkillContent/SkillOptionalField';
import { MetadataKeyValueDisplay } from './SkillContent/MetadataKeyValueDisplay';
import { FileContent } from './FileItems/FileContent';

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

  return (
    <PMBox p={6}>
      <PMHStack mb={6} justifyContent="space-between" alignItems="center">
        <PMText
          fontSize="2xs"
          fontWeight="medium"
          textTransform="uppercase"
          color="faded"
        >
          Version with accepted changes
        </PMText>
        {hasAccepted && (
          <DownloadAsAgentButton
            getPreviewCommand={getPreviewCommand}
            label="Try with agent"
          />
        )}
      </PMHStack>

      {hasAccepted ? (
        <>
          {showScalarFields && (
            <>
              <PMHeading size="md" mb={4}>
                {applied.name}
              </PMHeading>

              <PMMarkdownViewer content={applied.description} />

              <PMBox mt={4}>
                <PMText fontSize="sm" fontWeight="semibold" mb={2}>
                  Prompt
                </PMText>
                <PMMarkdownViewer content={applied.prompt} />
              </PMBox>

              {applied.license && (
                <SkillOptionalField label="License" mt={4}>
                  <PMText fontSize="sm">{applied.license}</PMText>
                </SkillOptionalField>
              )}

              {applied.compatibility && (
                <SkillOptionalField label="Compatibility" mt={4}>
                  <PMText fontSize="sm">{applied.compatibility}</PMText>
                </SkillOptionalField>
              )}

              {applied.allowedTools && (
                <SkillOptionalField label="Allowed Tools" mt={4}>
                  <PMText fontSize="sm">{applied.allowedTools}</PMText>
                </SkillOptionalField>
              )}

              {applied.metadata && Object.keys(applied.metadata).length > 0 && (
                <SkillOptionalField label="Metadata" mt={4}>
                  <MetadataKeyValueDisplay metadata={applied.metadata} />
                </SkillOptionalField>
              )}
            </>
          )}

          {showFiles && sortedFiles.length > 0 && (
            <PMVStack gap={4} align="stretch" mt={showScalarFields ? 6 : 0}>
              <PMText fontSize="md" fontWeight="semibold">
                Files
              </PMText>
              {sortedFiles.map((file) => (
                <PMBox
                  key={file.id}
                  border="1px solid"
                  borderColor="border.tertiary"
                  borderRadius="md"
                  overflow="hidden"
                >
                  <PMBox px={3} py={2} bg="background.secondary">
                    <PMText
                      fontSize="sm"
                      fontWeight="semibold"
                      fontFamily="mono"
                    >
                      {file.path}
                    </PMText>
                  </PMBox>
                  <PMBox p={3}>
                    <FileContent file={file} />
                  </PMBox>
                </PMBox>
              ))}
            </PMVStack>
          )}
        </>
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
