import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { PMGrid, PMPage, PMText, PMVStack } from '@packmind/ui';
import {
  createSkillFileId,
  Skill,
  SkillFile,
  SkillVersion,
} from '@packmind/types';
import { routes } from '../../../shared/utils/routes';
import { SkillDetailsSidebar } from './SkillDetailsSidebar';
import { SkillFilePreview } from './SkillFilePreview';
import { SkillVersionHistoryHeader } from './SkillVersionHistoryHeader';

interface ISkillDetailsProps {
  skill: Skill;
  files: SkillFile[];
  latestVersion: SkillVersion;
  skills: Skill[];
  skillsLoading: boolean;
  orgSlug?: string;
}

const SKILL_MD_FILENAME = 'SKILL.md';

export const SkillDetails = ({
  skill,
  files,
  latestVersion,
  skills,
  skillsLoading,
  orgSlug,
}: ISkillDetailsProps) => {
  const navigate = useNavigate();
  const { spaceSlug } = useParams<{ spaceSlug?: string }>();

  // Create virtual SKILL.md file with reconstructed content
  const skillMdFile = useMemo<SkillFile>(
    () => ({
      id: createSkillFileId(''),
      skillVersionId: latestVersion.id,
      permissions: '',
      path: SKILL_MD_FILENAME,
      content: latestVersion.prompt,
    }),
    [latestVersion],
  );

  // Combine virtual SKILL.md with other files for the sidebar
  const allFiles = useMemo(() => [skillMdFile, ...files], [skillMdFile, files]);

  // Default to SKILL.md
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(
    SKILL_MD_FILENAME,
  );

  const selectedFile = useMemo(() => {
    if (selectedFilePath === SKILL_MD_FILENAME) {
      return skillMdFile;
    }
    return files.find((f) => f.path === selectedFilePath) ?? null;
  }, [selectedFilePath, files, skillMdFile]);

  const handleSkillChange = (skillId: string) => {
    const selectedSkill = skills.find((s) => s.id === skillId);
    if (selectedSkill && orgSlug && spaceSlug) {
      navigate(routes.space.toSkill(orgSlug, spaceSlug, selectedSkill.slug));
    }
  };

  const handleFileSelect = (path: string) => {
    setSelectedFilePath(path);
  };

  return (
    <PMGrid
      height="full"
      gridTemplateColumns={{
        base: 'minmax(240px, 270px) minmax(0, 1fr)',
      }}
      gap={6}
      alignItems="start"
      overflowX="auto"
    >
      <SkillDetailsSidebar
        skill={skill}
        skills={skills}
        files={allFiles}
        selectedFilePath={selectedFilePath}
        onFileSelect={handleFileSelect}
        onSkillChange={handleSkillChange}
        isSkillSelectDisabled={!orgSlug || !spaceSlug}
        skillsLoading={skillsLoading}
      />

      {/* Main content */}
      <PMPage
        title={skill.name}
        breadcrumbComponent={
          <SkillVersionHistoryHeader
            skill={skill}
            latestVersion={latestVersion}
          />
        }
      >
        <PMVStack align="stretch" gap={6}>
          {latestVersion.description && (
            <PMText color="secondary">{latestVersion.description}</PMText>
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
            <SkillFilePreview file={selectedFile} />
          </PMVStack>
        </PMVStack>
      </PMPage>
    </PMGrid>
  );
};
