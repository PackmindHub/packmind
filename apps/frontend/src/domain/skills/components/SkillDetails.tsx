import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  PMGrid,
  PMHStack,
  PMPage,
  PMSeparator,
  PMText,
  PMVStack,
} from '@packmind/ui';
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
      isBase64: false,
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
    if (!selectedFilePath || selectedFilePath === SKILL_MD_FILENAME) {
      return skillMdFile;
    }
    return files.find((f) => f.path === selectedFilePath) ?? skillMdFile;
  }, [selectedFilePath, files, skillMdFile]);

  const resolvedSelectedFilePath = selectedFile?.path ?? SKILL_MD_FILENAME;

  const hasInfoFields = useMemo(
    () =>
      Boolean(
        latestVersion.license ||
        latestVersion.compatibility ||
        latestVersion.allowedTools ||
        (latestVersion.metadata &&
          Object.keys(latestVersion.metadata).length > 0),
      ),
    [latestVersion],
  );

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
        selectedFilePath={resolvedSelectedFilePath}
        onFileSelect={handleFileSelect}
        onSkillChange={handleSkillChange}
        isSkillSelectDisabled={!orgSlug || !spaceSlug}
        skillsLoading={skillsLoading}
        orgSlug={orgSlug}
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
          {resolvedSelectedFilePath === SKILL_MD_FILENAME && (
            <PMVStack
              align="stretch"
              gap={2}
              border="solid 1px"
              borderColor="border.tertiary"
              borderRadius="md"
              bg="background.tertiary"
              p={4}
            >
              <PMVStack gap={2} align="flex-start">
                <PMText color="secondary" fontSize="sm">
                  Description:
                </PMText>
                <PMText>{latestVersion.description}</PMText>
              </PMVStack>
              {hasInfoFields && (
                <>
                  <PMSeparator my={2} borderColor="border.secondary" />
                  {latestVersion.license && (
                    <PMHStack gap={2}>
                      <PMText color="secondary" fontSize="sm">
                        License:
                      </PMText>
                      <PMText fontSize="sm">{latestVersion.license}</PMText>
                    </PMHStack>
                  )}
                  {latestVersion.compatibility && (
                    <PMHStack gap={2}>
                      <PMText color="secondary" fontSize="sm">
                        Compatibility:
                      </PMText>
                      <PMText fontSize="sm">
                        {latestVersion.compatibility}
                      </PMText>
                    </PMHStack>
                  )}
                  {latestVersion.allowedTools && (
                    <PMHStack gap={2}>
                      <PMText color="secondary" fontSize="sm">
                        Allowed Tools:
                      </PMText>
                      <PMText fontSize="sm">
                        {latestVersion.allowedTools}
                      </PMText>
                    </PMHStack>
                  )}
                  {latestVersion.metadata &&
                    Object.keys(latestVersion.metadata).length > 0 && (
                      <PMVStack gap={1} align="stretch">
                        <PMText color="secondary" fontSize="sm">
                          Metadata:
                        </PMText>
                        <PMVStack gap={1} pl={4} align="flex-start">
                          {Object.entries(latestVersion.metadata).map(
                            ([key, value]) => (
                              <PMHStack key={key} gap={2}>
                                <PMText color="secondary" fontSize="sm">
                                  - {key}:
                                </PMText>
                                <PMText fontSize="sm">{value}</PMText>
                              </PMHStack>
                            ),
                          )}
                        </PMVStack>
                      </PMVStack>
                    )}
                </>
              )}
            </PMVStack>
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
