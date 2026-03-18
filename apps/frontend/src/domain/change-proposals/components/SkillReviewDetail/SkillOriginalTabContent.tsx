import { useMemo } from 'react';
import {
  PMBox,
  PMHeading,
  PMMarkdownViewer,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { Skill, SkillFile } from '@packmind/types';
import { SKILL_MD_PATH } from '../../utils/groupSkillProposalsByFile';
import { SkillFrontmatterInfo } from '../../../skills/components/SkillFrontmatterInfo';
import { FileContent } from './FileItems/FileContent';

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

  return (
    <PMBox p={6}>
      <PMBox mb={6}>
        <PMText
          fontSize="2xs"
          fontWeight="medium"
          textTransform="uppercase"
          color="faded"
        >
          Original Version
        </PMText>
      </PMBox>

      {showScalarFields && (
        <>
          <PMHeading size="md" mb={4}>
            {skill.name}
          </PMHeading>

          <SkillFrontmatterInfo skillVersion={skill} />

          <PMBox mt={4}>
            <PMText fontSize="sm" fontWeight="semibold" mb={2}>
              Prompt
            </PMText>
            <PMMarkdownViewer content={skill.prompt} />
          </PMBox>
        </>
      )}

      {showFiles && displayFiles.length > 0 && (
        <PMVStack gap={4} align="stretch" mt={showScalarFields ? 6 : 0}>
          <PMText fontSize="md" fontWeight="semibold">
            Files
          </PMText>
          {displayFiles.map((file) => (
            <PMBox
              key={file.id}
              border="1px solid"
              borderColor="border.tertiary"
              borderRadius="md"
              overflow="hidden"
            >
              <PMBox px={3} py={2} bg="background.secondary">
                <PMText fontSize="sm" fontWeight="semibold" fontFamily="mono">
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
    </PMBox>
  );
}
