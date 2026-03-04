import { useMemo } from 'react';
import {
  PMBox,
  PMHeading,
  PMMarkdownViewer,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { ChangeProposalType, Skill, SkillFile } from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { extractProposalDiffValues } from '../../utils/extractProposalDiffValues';
import { buildDiffSections } from '../../utils/buildDiffSections';
import { DiffBlock } from '../shared/DiffBlock';
import { isMarkdownPath } from './FileItems/FileContent';
import {
  SCALAR_SKILL_TYPES,
  SKILL_MD_MARKDOWN_TYPES,
} from '../../constants/skillProposalTypes';
import { getProposalFilePath } from '../../utils/groupSkillProposalsByFile';

interface SkillFocusedViewProps {
  proposal: ChangeProposalWithConflicts;
  skill: Skill;
  files: SkillFile[];
}

const contextOpacity = 0.5;

export function SkillFocusedView({
  proposal,
  skill,
  files,
}: Readonly<SkillFocusedViewProps>) {
  const { oldValue, newValue } = extractProposalDiffValues(proposal);
  const isScalar = SCALAR_SKILL_TYPES.has(proposal.type);

  const isMarkdownField = SKILL_MD_MARKDOWN_TYPES.has(proposal.type);

  const diffSections = useMemo(
    () => (isMarkdownField ? buildDiffSections(oldValue, newValue) : []),
    [isMarkdownField, oldValue, newValue],
  );

  if (isScalar) {
    return (
      <SkillMdFocusedView
        proposal={proposal}
        skill={skill}
        oldValue={oldValue}
        newValue={newValue}
        isMarkdownField={isMarkdownField}
        diffSections={diffSections}
      />
    );
  }

  return (
    <FileFocusedView
      proposal={proposal}
      files={files}
      oldValue={oldValue}
      newValue={newValue}
    />
  );
}

function SkillMdFocusedView({
  proposal,
  skill,
  oldValue,
  newValue,
  isMarkdownField,
  diffSections,
}: Readonly<{
  proposal: ChangeProposalWithConflicts;
  skill: Skill;
  oldValue: string;
  newValue: string;
  isMarkdownField: boolean;
  diffSections: ReturnType<typeof buildDiffSections>;
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

  return (
    <PMBox>
      {/* Name section */}
      <PMBox mb={4}>
        {isNameChange ? (
          <PMVStack gap={2} align="stretch">
            <PMText fontSize="xs" fontWeight="semibold" color="secondary">
              Name change
            </PMText>
            <DiffBlock value={oldValue} variant="removed" isMarkdown={false} />
            <DiffBlock value={newValue} variant="added" isMarkdown={false} />
          </PMVStack>
        ) : (
          <PMHeading size="md" color="primary" opacity={contextOpacity}>
            {skill.name}
          </PMHeading>
        )}
      </PMBox>

      {/* Description section */}
      <PMBox mb={4}>
        {isDescriptionChange ? (
          <RenderDiffSections
            diffSections={diffSections}
            isMarkdownField={isMarkdownField}
            oldValue={oldValue}
            newValue={newValue}
          />
        ) : (
          <PMBox opacity={contextOpacity}>
            <PMMarkdownViewer content={skill.description} />
          </PMBox>
        )}
      </PMBox>

      {/* Prompt section */}
      <PMBox mb={4}>
        {isPromptChange ? (
          <PMVStack gap={2} align="stretch">
            <PMText fontSize="xs" fontWeight="semibold" color="secondary">
              Prompt change
            </PMText>
            <RenderDiffSections
              diffSections={diffSections}
              isMarkdownField={isMarkdownField}
              oldValue={oldValue}
              newValue={newValue}
            />
          </PMVStack>
        ) : (
          <PMBox opacity={contextOpacity}>
            <PMText
              fontSize="xs"
              fontWeight="semibold"
              color="secondary"
              mb={1}
            >
              Prompt
            </PMText>
            <PMMarkdownViewer content={skill.prompt} />
          </PMBox>
        )}
      </PMBox>

      {/* Optional fields */}
      {(skill.license || isLicenseChange) && (
        <OptionalFieldDiff
          label="License"
          isChanged={isLicenseChange}
          currentValue={skill.license}
          oldValue={oldValue}
          newValue={newValue}
        />
      )}

      {(skill.compatibility || isCompatibilityChange) && (
        <OptionalFieldDiff
          label="Compatibility"
          isChanged={isCompatibilityChange}
          currentValue={skill.compatibility}
          oldValue={oldValue}
          newValue={newValue}
        />
      )}

      {(skill.allowedTools || isAllowedToolsChange) && (
        <OptionalFieldDiff
          label="Allowed Tools"
          isChanged={isAllowedToolsChange}
          currentValue={skill.allowedTools}
          oldValue={oldValue}
          newValue={newValue}
        />
      )}

      {(skill.metadata || isMetadataChange) && (
        <PMBox mb={4}>
          {isMetadataChange ? (
            <PMVStack gap={2} align="stretch">
              <PMText fontSize="xs" fontWeight="semibold" color="secondary">
                Metadata change
              </PMText>
              {oldValue && (
                <DiffBlock
                  value={oldValue}
                  variant="removed"
                  isMarkdown={false}
                />
              )}
              {newValue && (
                <DiffBlock
                  value={newValue}
                  variant="added"
                  isMarkdown={false}
                />
              )}
            </PMVStack>
          ) : (
            <PMBox opacity={contextOpacity}>
              <PMText
                fontSize="xs"
                fontWeight="semibold"
                color="secondary"
                mb={1}
              >
                Metadata
              </PMText>
              <PMText fontSize="sm" color="faded">
                {JSON.stringify(skill.metadata)}
              </PMText>
            </PMBox>
          )}
        </PMBox>
      )}
    </PMBox>
  );
}

function OptionalFieldDiff({
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
      {isChanged ? (
        <PMVStack gap={2} align="stretch">
          <PMText fontSize="xs" fontWeight="semibold" color="secondary">
            {label} change
          </PMText>
          {oldValue && (
            <DiffBlock value={oldValue} variant="removed" isMarkdown={false} />
          )}
          {newValue && (
            <DiffBlock value={newValue} variant="added" isMarkdown={false} />
          )}
        </PMVStack>
      ) : (
        <PMBox opacity={contextOpacity}>
          <PMText fontSize="xs" fontWeight="semibold" color="secondary" mb={1}>
            {label}
          </PMText>
          <PMText fontSize="sm" color="faded">
            {currentValue}
          </PMText>
        </PMBox>
      )}
    </PMBox>
  );
}

function RenderDiffSections({
  diffSections,
  isMarkdownField,
  oldValue,
  newValue,
}: Readonly<{
  diffSections: ReturnType<typeof buildDiffSections>;
  isMarkdownField: boolean;
  oldValue: string;
  newValue: string;
}>) {
  if (!isMarkdownField || diffSections.length === 0) {
    return (
      <PMVStack gap={2} align="stretch">
        {oldValue && (
          <DiffBlock
            value={oldValue}
            variant="removed"
            isMarkdown={isMarkdownField}
          />
        )}
        {newValue && (
          <DiffBlock
            value={newValue}
            variant="added"
            isMarkdown={isMarkdownField}
          />
        )}
      </PMVStack>
    );
  }

  return (
    <PMBox>
      {diffSections.map((section, index) =>
        section.type === 'unchanged' ? (
          <PMMarkdownViewer key={index} content={section.value} />
        ) : (
          <PMBox
            key={index}
            borderRadius="md"
            border="1px dashed"
            borderColor="border.tertiary"
            p={4}
            my={2}
          >
            {section.oldValue && (
              <DiffBlock
                value={section.oldValue}
                variant="removed"
                isMarkdown={true}
              />
            )}
            {section.newValue && (
              <PMBox mt={section.oldValue ? 2 : 0}>
                <DiffBlock
                  value={section.newValue}
                  variant="added"
                  isMarkdown={true}
                />
              </PMBox>
            )}
          </PMBox>
        ),
      )}
    </PMBox>
  );
}

function FileFocusedView({
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

  const diffSections = useMemo(
    () =>
      isMarkdown && isUpdateContent
        ? buildDiffSections(oldValue, newValue)
        : [],
    [isMarkdown, isUpdateContent, oldValue, newValue],
  );

  return (
    <PMBox>
      <PMText fontSize="xs" fontWeight="semibold" color="secondary" mb={2}>
        {filePath}
      </PMText>

      {isAddFile && (
        <DiffBlock
          value={newValue}
          variant="added"
          isMarkdown={isMarkdown}
          filePath={filePath}
          showIndicator={false}
        />
      )}

      {isDeleteFile && (
        <DiffBlock
          value={oldValue}
          variant="removed"
          isMarkdown={isMarkdown}
          filePath={filePath}
          showIndicator={false}
        />
      )}

      {isUpdateContent &&
        (isMarkdown ? (
          <RenderDiffSections
            diffSections={diffSections}
            isMarkdownField={true}
            oldValue={oldValue}
            newValue={newValue}
          />
        ) : (
          <PMVStack gap={2} align="stretch">
            <DiffBlock
              value={oldValue}
              variant="removed"
              isMarkdown={false}
              filePath={filePath}
            />
            <DiffBlock
              value={newValue}
              variant="added"
              isMarkdown={false}
              filePath={filePath}
            />
          </PMVStack>
        ))}

      {isUpdatePermissions && (
        <PMVStack gap={2} align="stretch">
          <PMText fontSize="xs" color="secondary">
            Permissions change
          </PMText>
          <DiffBlock value={oldValue} variant="removed" isMarkdown={false} />
          <DiffBlock value={newValue} variant="added" isMarkdown={false} />
        </PMVStack>
      )}
    </PMBox>
  );
}
