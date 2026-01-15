import { useMemo } from 'react';
import { useOutletContext, useParams } from 'react-router';
import { PMHStack, PMSeparator, PMText, PMVStack } from '@packmind/ui';
import { createSkillFileId, SkillFile } from '@packmind/types';

import { SkillFilePreview } from '../../src/domain/skills/components/SkillFilePreview';
import type { ISkillDetailsOutletContext } from './org.$orgSlug._protected.space.$spaceSlug._space-protected.skills.$skillSlug';

const SKILL_MD_FILENAME = 'SKILL.md';

export default function SkillFilesRouteModule() {
  const { '*': filePath } = useParams<{ '*': string }>();
  const { skill, files, latestVersion } =
    useOutletContext<ISkillDetailsOutletContext>();

  // Create virtual SKILL.md file
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

  // Determine selected file path, default to SKILL.md
  const selectedFilePath = filePath || SKILL_MD_FILENAME;

  // Find the selected file
  const selectedFile = useMemo(() => {
    if (!selectedFilePath || selectedFilePath === SKILL_MD_FILENAME) {
      return skillMdFile;
    }
    return files.find((f) => f.path === selectedFilePath) ?? skillMdFile;
  }, [selectedFilePath, files, skillMdFile]);

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

  const showDescriptionBox = selectedFile?.path === SKILL_MD_FILENAME;

  return (
    <PMVStack align="stretch" gap={6}>
      {showDescriptionBox && (
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
                  <PMText fontSize="sm">{latestVersion.compatibility}</PMText>
                </PMHStack>
              )}
              {latestVersion.allowedTools && (
                <PMHStack gap={2}>
                  <PMText color="secondary" fontSize="sm">
                    Allowed Tools:
                  </PMText>
                  <PMText fontSize="sm">{latestVersion.allowedTools}</PMText>
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
  );
}
