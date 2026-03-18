import { useEffect, useMemo, useRef } from 'react';
import { useOutletContext, useParams } from 'react-router';
import { PMVStack } from '@packmind/ui';
import { createSkillFileId, SkillFile } from '@packmind/types';

import { SkillFilePreview } from '../../src/domain/skills/components/SkillFilePreview';
import { SkillFrontmatterInfo } from '../../src/domain/skills/components/SkillFrontmatterInfo';
import { buildSkillMdContent } from '../../src/domain/skills/utils/skillMdUtils';
import type { ISkillDetailsOutletContext } from './org.$orgSlug._protected.space.$spaceSlug._space-protected.skills.$skillSlug';

const SKILL_MD_FILENAME = 'SKILL.md';

export default function SkillFilesRouteModule() {
  const { '*': filePath } = useParams<{ '*': string }>();
  const { skill, files, latestVersion } =
    useOutletContext<ISkillDetailsOutletContext>();

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

  const topRef = useRef<HTMLDivElement>(null);

  // Determine selected file path, default to SKILL.md
  const selectedFilePath = filePath || SKILL_MD_FILENAME;

  useEffect(() => {
    topRef.current?.scrollIntoView({ block: 'start' });
  }, [selectedFilePath]);

  // Find the selected file
  const selectedFile = useMemo(() => {
    if (!selectedFilePath || selectedFilePath === SKILL_MD_FILENAME) {
      return skillMdFile;
    }
    return files.find((f) => f.path === selectedFilePath) ?? skillMdFile;
  }, [selectedFilePath, files, skillMdFile]);

  const showDescriptionBox = selectedFile?.path === SKILL_MD_FILENAME;

  return (
    <div ref={topRef}>
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
            rawContent={
              selectedFile?.path === SKILL_MD_FILENAME
                ? skillMdClipboardContent
                : undefined
            }
          />
        </PMVStack>
      </PMVStack>
    </div>
  );
}
