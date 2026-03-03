import {
  PMBox,
  PMHeading,
  PMMarkdownViewer,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { Skill, SkillFile } from '@packmind/types';
import { SkillOptionalField } from './SkillContent/SkillOptionalField';
import { MetadataKeyValueDisplay } from './SkillContent/MetadataKeyValueDisplay';
import { FileContent } from './FileItems/FileContent';

interface SkillOriginalTabContentProps {
  skill: Skill;
  files: SkillFile[];
}

export function SkillOriginalTabContent({
  skill,
  files,
}: Readonly<SkillOriginalTabContentProps>) {
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

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

      <PMHeading size="md" mb={4}>
        {skill.name}
      </PMHeading>

      <PMMarkdownViewer content={skill.description} />

      <PMBox mt={4}>
        <PMText fontSize="sm" fontWeight="semibold" mb={2}>
          Prompt
        </PMText>
        <PMMarkdownViewer content={skill.prompt} />
      </PMBox>

      {skill.license && (
        <SkillOptionalField label="License" mt={4}>
          <PMText fontSize="sm">{skill.license}</PMText>
        </SkillOptionalField>
      )}

      {skill.compatibility && (
        <SkillOptionalField label="Compatibility" mt={4}>
          <PMText fontSize="sm">{skill.compatibility}</PMText>
        </SkillOptionalField>
      )}

      {skill.allowedTools && (
        <SkillOptionalField label="Allowed Tools" mt={4}>
          <PMText fontSize="sm">{skill.allowedTools}</PMText>
        </SkillOptionalField>
      )}

      {skill.metadata && Object.keys(skill.metadata).length > 0 && (
        <SkillOptionalField label="Metadata" mt={4}>
          <MetadataKeyValueDisplay metadata={skill.metadata} />
        </SkillOptionalField>
      )}

      {sortedFiles.length > 0 && (
        <PMVStack gap={4} align="stretch" mt={6}>
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
