import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { PMGrid, PMPage, PMVStack } from '@packmind/ui';
import { Skill, SkillFile, SkillFileId, SkillVersion } from '@packmind/types';
import { routes } from '../../../shared/utils/routes';
import { buildSkillMarkdown } from '../utils/buildSkillMarkdown';
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

  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(
    files.find((f) => f.path === SKILL_MD_FILENAME)?.path ??
      files[0]?.path ??
      null,
  );

  const selectedFile = useMemo(() => {
    if (selectedFilePath === SKILL_MD_FILENAME) {
      const reconstructedContent = buildSkillMarkdown(latestVersion);
      const existingFile = files.find((f) => f.path === SKILL_MD_FILENAME);
      return {
        id: existingFile?.id ?? ('' as SkillFileId),
        skillVersionId: existingFile?.skillVersionId ?? latestVersion.id,
        permissions: existingFile?.permissions ?? '',
        path: SKILL_MD_FILENAME,
        content: reconstructedContent,
      };
    }
    return files.find((f) => f.path === selectedFilePath) ?? null;
  }, [selectedFilePath, files, latestVersion]);

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
        files={files}
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
        isFullWidth
      >
        <PMVStack align="stretch" gap={6}>
          <SkillFilePreview file={selectedFile} />
        </PMVStack>
      </PMPage>
    </PMGrid>
  );
};
