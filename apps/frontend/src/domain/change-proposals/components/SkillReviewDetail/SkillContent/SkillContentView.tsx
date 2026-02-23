import { useEffect, useState } from 'react';
import { PMAccordion, PMBox, PMHStack, PMText, PMVStack } from '@packmind/ui';
import {
  CollectionItemAddPayload,
  CollectionItemDeletePayload,
  CollectionItemUpdatePayload,
  ScalarUpdatePayload,
  SkillFile,
  SkillFileId,
  SkillWithFiles,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../../types';
import { renderDiffText } from '../../../utils/renderDiffText';
import { renderMarkdownDiffOrPreview } from './renderMarkdownDiffOrPreview';
import { SkillOptionalField } from './SkillOptionalField';
import { FileAccordionItem } from '../FileItems/FileAccordionItem';
import { UpdatedFileContentItem } from '../FileItems/UpdatedFileContentItem';
import { UpdatedFilePermissionsItem } from '../FileItems/UpdatedFilePermissionsItem';
import { DeletedFileItem } from '../FileItems/DeletedFileItem';
import { AddedFileItem } from '../FileItems/AddedFileItem';

const defaultProposalTypeFlags = {
  isNameDiff: false,
  isDescriptionDiff: false,
  isPromptDiff: false,
  isMetadataDiff: false,
  isLicenseDiff: false,
  isCompatibilityDiff: false,
  isAllowedToolsDiff: false,
  isAddFile: false,
  isUpdateFileContent: false,
  isUpdateFilePermissions: false,
  isDeleteFile: false,
} as const;

export type ProposalTypeFlags = {
  [K in keyof typeof defaultProposalTypeFlags]: boolean;
};

const emptyPayload = { oldValue: '', newValue: '' } as ScalarUpdatePayload;

function MetadataKeyValueDisplay({
  metadata,
}: {
  metadata: Record<string, string>;
}) {
  return (
    <PMVStack gap={1} align="flex-start">
      {Object.entries(metadata).map(([key, value]) => (
        <PMHStack key={key} gap={2}>
          <PMText fontSize="sm" fontWeight="bold">
            {key}:
          </PMText>
          <PMText fontSize="sm">{value}</PMText>
        </PMHStack>
      ))}
    </PMVStack>
  );
}

function parseMetadataJson(value: string): Record<string, string> {
  try {
    return JSON.parse(value) as Record<string, string>;
  } catch {
    return {};
  }
}

function MetadataKeyValueDiff({
  oldValue,
  newValue,
}: {
  oldValue: string;
  newValue: string;
}) {
  const oldMetadata = parseMetadataJson(oldValue);
  const newMetadata = parseMetadataJson(newValue);
  const allKeys = [
    ...new Set([...Object.keys(oldMetadata), ...Object.keys(newMetadata)]),
  ];

  return (
    <PMVStack gap={1} align="flex-start">
      {allKeys.map((key) => {
        const inOld = key in oldMetadata;
        const inNew = key in newMetadata;

        if (inOld && !inNew) {
          return (
            <PMBox
              key={key}
              bg="red.subtle"
              borderRadius="sm"
              paddingX={1}
              data-diff-change
            >
              <PMHStack gap={2}>
                <PMText
                  fontSize="sm"
                  fontWeight="bold"
                  textDecoration="line-through"
                >
                  {key}:
                </PMText>
                <PMText fontSize="sm" textDecoration="line-through">
                  {oldMetadata[key]}
                </PMText>
              </PMHStack>
            </PMBox>
          );
        }

        if (!inOld && inNew) {
          return (
            <PMBox
              key={key}
              bg="green.subtle"
              borderRadius="sm"
              paddingX={1}
              data-diff-change
            >
              <PMHStack gap={2}>
                <PMText fontSize="sm" fontWeight="bold">
                  {key}:
                </PMText>
                <PMText fontSize="sm">{newMetadata[key]}</PMText>
              </PMHStack>
            </PMBox>
          );
        }

        if (oldMetadata[key] !== newMetadata[key]) {
          return (
            <PMHStack key={key} gap={2}>
              <PMText fontSize="sm" fontWeight="bold">
                {key}:
              </PMText>
              <PMText fontSize="sm">
                {renderDiffText(oldMetadata[key], newMetadata[key])}
              </PMText>
            </PMHStack>
          );
        }

        return (
          <PMHStack key={key} gap={2}>
            <PMText fontSize="sm" fontWeight="bold">
              {key}:
            </PMText>
            <PMText fontSize="sm">{newMetadata[key]}</PMText>
          </PMHStack>
        );
      })}
    </PMVStack>
  );
}

export function SkillContentView({
  skill,
  files,
  proposalTypeFlags = defaultProposalTypeFlags,
  scalarPayload = emptyPayload,
  reviewingProposal,
  showPreview,
  targetFileId,
}: {
  skill: SkillWithFiles['skill'];
  files: SkillFile[];
  proposalTypeFlags?: ProposalTypeFlags;
  scalarPayload?: ScalarUpdatePayload;
  reviewingProposal?: ChangeProposalWithConflicts;
  showPreview: boolean;
  targetFileId?: string;
}) {
  const {
    isNameDiff,
    isDescriptionDiff,
    isPromptDiff,
    isMetadataDiff,
    isLicenseDiff,
    isCompatibilityDiff,
    isAllowedToolsDiff,
    isAddFile,
    isUpdateFileContent,
    isUpdateFilePermissions,
    isDeleteFile,
  } = proposalTypeFlags;

  const [openFileIds, setOpenFileIds] = useState<string[]>(
    targetFileId ? [targetFileId] : [],
  );

  useEffect(() => {
    if (targetFileId) {
      setOpenFileIds((prev) =>
        prev.includes(targetFileId) ? prev : [...prev, targetFileId],
      );
    }
  }, [targetFileId]);

  return (
    <PMVStack gap={4} align="stretch">
      {/* Skill Name */}
      <PMText
        fontSize="lg"
        fontWeight="semibold"
        {...(isNameDiff && { 'data-diff-section': true })}
      >
        {isNameDiff
          ? renderDiffText(scalarPayload.oldValue, scalarPayload.newValue)
          : skill.name}
      </PMText>

      {/* Description */}
      <PMVStack
        gap={1}
        align="stretch"
        {...(isDescriptionDiff && { 'data-diff-section': true })}
      >
        {renderMarkdownDiffOrPreview(
          isDescriptionDiff,
          showPreview,
          scalarPayload,
          skill.description,
          {
            previewPaddingVariant: 'none',
            defaultPaddingVariant: 'none',
          },
        )}
      </PMVStack>

      {/* License (optional) */}
      {(skill.license || isLicenseDiff) && (
        <SkillOptionalField
          label="License"
          {...(isLicenseDiff && { 'data-diff-section': true })}
        >
          <PMText>
            {isLicenseDiff
              ? renderDiffText(scalarPayload.oldValue, scalarPayload.newValue)
              : skill.license}
          </PMText>
        </SkillOptionalField>
      )}

      {/* Compatibility (optional) */}
      {(skill.compatibility || isCompatibilityDiff) && (
        <SkillOptionalField
          label="Compatibility"
          {...(isCompatibilityDiff && { 'data-diff-section': true })}
        >
          <PMText>
            {isCompatibilityDiff
              ? renderDiffText(scalarPayload.oldValue, scalarPayload.newValue)
              : skill.compatibility}
          </PMText>
        </SkillOptionalField>
      )}

      {/* Allowed Tools (optional) */}
      {(skill.allowedTools || isAllowedToolsDiff) && (
        <SkillOptionalField
          label="Allowed Tools"
          {...(isAllowedToolsDiff && { 'data-diff-section': true })}
        >
          <PMText>
            {isAllowedToolsDiff
              ? renderDiffText(scalarPayload.oldValue, scalarPayload.newValue)
              : skill.allowedTools}
          </PMText>
        </SkillOptionalField>
      )}

      {/* Metadata (optional) */}
      {(skill.metadata || isMetadataDiff) && (
        <SkillOptionalField
          label="Metadata"
          {...(isMetadataDiff && { 'data-diff-section': true })}
        >
          {isMetadataDiff ? (
            <MetadataKeyValueDiff
              oldValue={scalarPayload.oldValue}
              newValue={scalarPayload.newValue}
            />
          ) : (
            <MetadataKeyValueDisplay
              metadata={skill.metadata as Record<string, string>}
            />
          )}
        </SkillOptionalField>
      )}

      {/* SKILL.md section */}
      <PMVStack gap={2} {...(isPromptDiff && { 'data-diff-section': true })}>
        <PMAccordion.Root collapsible multiple defaultValue={['SKILL.md']}>
          <PMAccordion.Item
            value="SKILL.md"
            borderRadius="md"
            border="1px solid"
            borderColor="border.primary"
          >
            <PMAccordion.ItemTrigger
              cursor="pointer"
              bg="background.primary"
              px={2}
            >
              <PMAccordion.ItemIndicator />
              <PMText fontSize="sm" fontWeight="semibold">
                SKILL.md
              </PMText>
            </PMAccordion.ItemTrigger>
            <PMAccordion.ItemContent padding={4}>
              {renderMarkdownDiffOrPreview(
                isPromptDiff,
                showPreview,
                scalarPayload,
                skill.prompt,
                {
                  diffBoxPadding: '16px',
                  defaultPaddingVariant: 'none',
                },
              )}
            </PMAccordion.ItemContent>
          </PMAccordion.Item>
        </PMAccordion.Root>
      </PMVStack>

      {/* Files section */}
      {(files.length > 0 ||
        isAddFile ||
        isDeleteFile ||
        isUpdateFileContent ||
        isUpdateFilePermissions) && (
        <PMVStack
          gap={2}
          {...((isAddFile ||
            isUpdateFileContent ||
            isUpdateFilePermissions ||
            isDeleteFile) && { 'data-diff-section': true })}
        >
          <PMText
            fontSize="sm"
            fontWeight="bold"
            color="secondary"
            width="full"
          >
            Files
          </PMText>
          <PMAccordion.Root
            collapsible
            multiple
            value={openFileIds}
            onValueChange={(details) => setOpenFileIds(details.value)}
            spaceY={2}
          >
            {files.map((file) => {
              if (isUpdateFileContent && reviewingProposal) {
                const contentPayload =
                  reviewingProposal.payload as CollectionItemUpdatePayload<SkillFileId>;
                if (file.id === contentPayload.targetId)
                  return (
                    <UpdatedFileContentItem
                      key={file.id}
                      file={file}
                      payload={contentPayload}
                    />
                  );
              }
              if (isUpdateFilePermissions && reviewingProposal) {
                const permPayload =
                  reviewingProposal.payload as CollectionItemUpdatePayload<SkillFileId>;
                if (file.id === permPayload.targetId)
                  return (
                    <UpdatedFilePermissionsItem
                      key={file.id}
                      file={file}
                      payload={permPayload}
                    />
                  );
              }
              if (isDeleteFile && reviewingProposal) {
                const deletePayload =
                  reviewingProposal.payload as CollectionItemDeletePayload<
                    Omit<SkillFile, 'skillVersionId'>
                  >;
                if (file.id === deletePayload.targetId)
                  return <DeletedFileItem key={file.id} file={file} />;
              }
              return <FileAccordionItem key={file.id} file={file} />;
            })}
            {isAddFile && reviewingProposal && (
              <AddedFileItem
                payload={
                  reviewingProposal.payload as CollectionItemAddPayload<
                    Omit<SkillFile, 'skillVersionId'>
                  >
                }
              />
            )}
          </PMAccordion.Root>
        </PMVStack>
      )}
    </PMVStack>
  );
}
