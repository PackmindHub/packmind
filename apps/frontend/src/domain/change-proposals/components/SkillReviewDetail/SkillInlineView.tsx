import { useMemo } from 'react';
import {
  PMBox,
  PMCodeMirror,
  PMMarkdownViewer,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { ChangeProposalType, SkillFile } from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { extractProposalDiffValues } from '../../utils/extractProposalDiffValues';
import { renderDiffText } from '../../utils/renderDiffText';
import { buildDiffSections } from '../../utils/buildDiffSections';
import { BinaryFilePlaceholder } from '../shared/BinaryFilePlaceholder';
import { isMarkdownPath } from './FileItems/FileContent';
import { getFileLanguage } from '../../../skills/utils/fileTreeUtils';
import {
  SCALAR_SKILL_TYPES,
  SKILL_MD_MARKDOWN_TYPES,
} from '../../constants/skillProposalTypes';
import {
  getProposalFilePath,
  isBinaryProposal,
} from '../../utils/groupSkillProposalsByFile';

interface SkillInlineViewProps {
  proposal: ChangeProposalWithConflicts;
  files: SkillFile[];
}

export function SkillInlineView({
  proposal,
  files,
}: Readonly<SkillInlineViewProps>) {
  const { oldValue, newValue } = extractProposalDiffValues(proposal);
  const isScalar = SCALAR_SKILL_TYPES.has(proposal.type);
  const isMarkdownField = SKILL_MD_MARKDOWN_TYPES.has(proposal.type);

  if (isScalar) {
    return isMarkdownField ? (
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
    <PMBox fontSize="sm">
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

  const isBinary = isBinaryProposal(proposal);
  const isMarkdown = isMarkdownPath(filePath);

  if (isBinary) {
    return (
      <PMBox>
        <PMText fontSize="xs" fontWeight="semibold" color="secondary" mb={2}>
          {filePath}
        </PMText>
        <BinaryFilePlaceholder />
      </PMBox>
    );
  }

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
          fontSize="sm"
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
          fontSize="sm"
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
