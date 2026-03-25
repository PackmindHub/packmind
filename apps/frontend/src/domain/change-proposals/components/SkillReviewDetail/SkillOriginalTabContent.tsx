import { useMemo } from 'react';
import { PMBox, PMMarkdownViewer, PMText, PMVStack } from '@packmind/ui';
import { Skill, SkillFile } from '@packmind/types';
import { SKILL_MD_PATH } from '../../utils/groupSkillProposalsByFile';
import { serializeSkillToMarkdown } from '../../utils/serializeArtifactToMarkdown';
import { SkillFrontmatterInfo } from '../../../skills/components/SkillFrontmatterInfo';
import { SkillFilePreview } from '../../../skills/components/SkillFilePreview';
import { ArtifactResultFilePreview } from '../shared/ArtifactResultFilePreview';

interface SkillOriginalTabContentProps {
  skill: Skill;
  files: SkillFile[];
  filePathFilter?: string;
}

function filterFiles(files: SkillFile[], filter: string): SkillFile[] {
  return files.filter(
    (f) => f.path === filter || f.path.startsWith(filter + '/'),
  );
}

export function SkillOriginalTabContent({
  skill,
  files,
  filePathFilter = '',
}: Readonly<SkillOriginalTabContentProps>) {
  const showScalarFields = !filePathFilter || filePathFilter === SKILL_MD_PATH;
  const showFiles = !filePathFilter || filePathFilter !== SKILL_MD_PATH;

  const displayFiles = useMemo(() => {
    const filtered =
      filePathFilter && filePathFilter !== SKILL_MD_PATH
        ? filterFiles(files, filePathFilter)
        : files;
    return [...filtered].sort((a, b) => a.path.localeCompare(b.path));
  }, [files, filePathFilter]);

  const markdown = useMemo(() => serializeSkillToMarkdown(skill), [skill]);

  const skillMdPreview = (
    <PMVStack align="stretch" gap={4}>
      <SkillFrontmatterInfo skillVersion={skill} />
      <PMBox
        border="solid 1px"
        borderColor="border.primary"
        borderRadius="md"
        padding={4}
        backgroundColor="background.primary"
      >
        <PMMarkdownViewer content={skill.prompt} />
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
        Original Version
      </PMText>

      <PMVStack gap={6} align="stretch">
        {showScalarFields && (
          <ArtifactResultFilePreview
            fileName={SKILL_MD_PATH}
            markdown={markdown}
            previewContent={skillMdPreview}
          />
        )}

        {showFiles && displayFiles.length > 0 && (
          <PMVStack gap={4} align="stretch">
            <PMText fontSize="md" fontWeight="semibold">
              Files
            </PMText>
            {displayFiles.map((file) => (
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
    </PMBox>
  );
}
