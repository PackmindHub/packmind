import { useMemo } from 'react';
import {
  PMBox,
  PMCodeMirror,
  PMHeading,
  PMMarkdownViewer,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { ChangeProposalType, Skill, SkillFile } from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { extractProposalDiffValues } from '../../utils/extractProposalDiffValues';
import { renderDiffText } from '../../utils/renderDiffText';
import { buildDiffSections } from '../../utils/buildDiffSections';
import { isMarkdownPath } from './FileItems/FileContent';
import { getFileLanguage } from '../../../skills/utils/fileTreeUtils';
import {
  SCALAR_SKILL_TYPES,
  SKILL_MD_MARKDOWN_TYPES,
} from '../../constants/skillProposalTypes';
import { getProposalFilePath } from '../../utils/groupSkillProposalsByFile';

interface SkillInlineViewProps {
  proposal: ChangeProposalWithConflicts;
  skill: Skill;
  files: SkillFile[];
}

export function SkillInlineView({
  proposal,
  skill,
  files,
}: Readonly<SkillInlineViewProps>) {
  const { oldValue, newValue } = extractProposalDiffValues(proposal);
  const isScalar = SCALAR_SKILL_TYPES.has(proposal.type);

  if (isScalar) {
    return (
      <SkillMdInlineView
        proposal={proposal}
        skill={skill}
        oldValue={oldValue}
        newValue={newValue}
      />
    );
  }

  return (
    <FileInlineView
      proposal={proposal}
      files={files}
      oldValue={oldValue}
      newValue={newValue}
    />
  );
}

function SkillMdInlineView({
  proposal,
  skill,
  oldValue,
  newValue,
}: Readonly<{
  proposal: ChangeProposalWithConflicts;
  skill: Skill;
  oldValue: string;
  newValue: string;
}>) {
  const isNameChange = proposal.type === ChangeProposalType.updateSkillName;
  const isDescriptionChange =
    proposal.type === ChangeProposalType.updateSkillDescription;
  const isPromptChange = proposal.type === ChangeProposalType.updateSkillPrompt;
  const isMetadataChange =
    proposal.type === ChangeProposalType.updateSkillMetadata;
  const isLicenseChange =
    proposal.type === ChangeProposalType.updateSkillLicense;
  const isCompatibilityChange =
    proposal.type === ChangeProposalType.updateSkillCompatibility;
  const isAllowedToolsChange =
    proposal.type === ChangeProposalType.updateSkillAllowedTools;

  const isFieldChange =
    isLicenseChange ||
    isCompatibilityChange ||
    isAllowedToolsChange ||
    isMetadataChange;

  return (
    <PMBox>
      {/* Name section */}
      <PMBox mb={4}>
        {isNameChange ? (
          <PMHeading size="md">{renderDiffText(oldValue, newValue)}</PMHeading>
        ) : (
          <PMHeading size="md" color={isFieldChange ? 'faded' : undefined}>
            {skill.name}
          </PMHeading>
        )}
      </PMBox>

      {/* Description section */}
      <PMBox
        mb={4}
        opacity={isDescriptionChange ? 1 : isFieldChange ? 0.5 : 0.7}
      >
        {isDescriptionChange ? (
          <DescriptionInlineDiff oldValue={oldValue} newValue={newValue} />
        ) : (
          <PMMarkdownViewer content={skill.description} />
        )}
      </PMBox>

      {/* Prompt section */}
      <PMBox mb={4} opacity={isPromptChange ? 1 : isFieldChange ? 0.5 : 0.7}>
        <PMText fontSize="sm" fontWeight="semibold" mb={1}>
          Prompt
        </PMText>
        {isPromptChange ? (
          <DescriptionInlineDiff oldValue={oldValue} newValue={newValue} />
        ) : (
          <PMMarkdownViewer content={skill.prompt} />
        )}
      </PMBox>

      {/* Optional fields */}
      {(skill.license || isLicenseChange) && (
        <InlineOptionalField
          label="License"
          isChanged={isLicenseChange}
          currentValue={skill.license}
          oldValue={oldValue}
          newValue={newValue}
        />
      )}

      {(skill.compatibility || isCompatibilityChange) && (
        <InlineOptionalField
          label="Compatibility"
          isChanged={isCompatibilityChange}
          currentValue={skill.compatibility}
          oldValue={oldValue}
          newValue={newValue}
        />
      )}

      {(skill.allowedTools || isAllowedToolsChange) && (
        <InlineOptionalField
          label="Allowed Tools"
          isChanged={isAllowedToolsChange}
          currentValue={skill.allowedTools}
          oldValue={oldValue}
          newValue={newValue}
        />
      )}

      {(skill.metadata || isMetadataChange) && (
        <PMBox mb={4}>
          <PMText fontSize="sm" fontWeight="semibold" mb={1}>
            Metadata
          </PMText>
          {isMetadataChange ? (
            <PMText fontSize="sm">{renderDiffText(oldValue, newValue)}</PMText>
          ) : (
            <PMText fontSize="sm" color="faded">
              {JSON.stringify(skill.metadata)}
            </PMText>
          )}
        </PMBox>
      )}
    </PMBox>
  );
}

function InlineOptionalField({
  label,
  isChanged,
  currentValue,
  oldValue,
  newValue,
}: Readonly<{
  label: string;
  isChanged: boolean;
  currentValue: string | undefined;
  oldValue: string;
  newValue: string;
}>) {
  return (
    <PMBox mb={4}>
      <PMText fontSize="sm" fontWeight="semibold" mb={1}>
        {label}
      </PMText>
      {isChanged ? (
        <PMText fontSize="sm">{renderDiffText(oldValue, newValue)}</PMText>
      ) : (
        <PMText fontSize="sm" color="faded">
          {currentValue}
        </PMText>
      )}
    </PMBox>
  );
}

function DescriptionInlineDiff({
  oldValue,
  newValue,
}: Readonly<{
  oldValue: string;
  newValue: string;
}>) {
  const sections = useMemo(
    () => buildDiffSections(oldValue, newValue),
    [oldValue, newValue],
  );

  return (
    <PMBox>
      {sections.map((section, index) =>
        section.type === 'unchanged' ? (
          <PMMarkdownViewer key={index} content={section.value} />
        ) : (
          <PMBox
            key={index}
            borderRadius="md"
            border="1px dashed"
            borderColor="border.tertiary"
            p={3}
            my={2}
          >
            <PMText fontSize="sm" lineHeight="tall">
              {renderDiffText(section.oldValue, section.newValue)}
            </PMText>
          </PMBox>
        ),
      )}
    </PMBox>
  );
}

function FileInlineView({
  proposal,
  files,
  oldValue,
  newValue,
}: Readonly<{
  proposal: ChangeProposalWithConflicts;
  files: SkillFile[];
  oldValue: string;
  newValue: string;
}>) {
  const isAddFile = proposal.type === ChangeProposalType.addSkillFile;
  const isDeleteFile = proposal.type === ChangeProposalType.deleteSkillFile;
  const isUpdateContent =
    proposal.type === ChangeProposalType.updateSkillFileContent;
  const isUpdatePermissions =
    proposal.type === ChangeProposalType.updateSkillFilePermissions;

  const filePath = useMemo(
    () => getProposalFilePath(proposal, files),
    [proposal, files],
  );

  const isMarkdown = isMarkdownPath(filePath);

  return (
    <PMBox>
      <PMText fontSize="xs" fontWeight="semibold" color="secondary" mb={2}>
        {filePath}
      </PMText>

      {isAddFile && (
        <PMBox
          p={3}
          bg="green.500/10"
          borderLeft="2px solid"
          borderColor="green.500/30"
          borderRadius="md"
        >
          {isMarkdown ? (
            <PMMarkdownViewer content={newValue} />
          ) : (
            <PMCodeMirror
              value={newValue}
              language={getFileLanguage(filePath)}
              readOnly
            />
          )}
        </PMBox>
      )}

      {isDeleteFile && (
        <PMBox
          p={3}
          bg="red.500/10"
          borderLeft="2px solid"
          borderColor="red.500/30"
          borderRadius="md"
        >
          {isMarkdown ? (
            <PMBox opacity={0.7} textDecoration="line-through">
              <PMMarkdownViewer content={oldValue} />
            </PMBox>
          ) : (
            <PMBox opacity={0.7}>
              <PMCodeMirror
                value={oldValue}
                language={getFileLanguage(filePath)}
                readOnly
              />
            </PMBox>
          )}
        </PMBox>
      )}

      {isUpdateContent &&
        (isMarkdown ? (
          <DescriptionInlineDiff oldValue={oldValue} newValue={newValue} />
        ) : (
          <PMBox
            p={3}
            bg="background.tertiary"
            borderLeft="2px solid"
            borderColor="border.tertiary"
            borderRadius="md"
          >
            <PMText fontSize="sm">{renderDiffText(oldValue, newValue)}</PMText>
          </PMBox>
        ))}

      {isUpdatePermissions && (
        <PMVStack gap={2} align="stretch">
          <PMText fontSize="xs" color="secondary">
            Permissions change
          </PMText>
          <PMBox
            p={3}
            bg="background.tertiary"
            borderLeft="2px solid"
            borderColor="border.tertiary"
            borderRadius="md"
          >
            <PMText fontSize="sm">{renderDiffText(oldValue, newValue)}</PMText>
          </PMBox>
        </PMVStack>
      )}
    </PMBox>
  );
}
