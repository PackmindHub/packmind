import { PMAccordion, PMText, PMVStack } from '@packmind/ui';
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

  return (
    <PMVStack gap={4} align="stretch">
      {/* Skill Name */}
      <PMText fontSize="lg" fontWeight="semibold">
        {isNameDiff
          ? renderDiffText(scalarPayload.oldValue, scalarPayload.newValue)
          : skill.name}
      </PMText>

      {/* Description */}
      <PMVStack gap={1} align="stretch">
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
        <SkillOptionalField label="License">
          <PMText>
            {isLicenseDiff
              ? renderDiffText(scalarPayload.oldValue, scalarPayload.newValue)
              : skill.license}
          </PMText>
        </SkillOptionalField>
      )}

      {/* Compatibility (optional) */}
      {(skill.compatibility || isCompatibilityDiff) && (
        <SkillOptionalField label="Compatibility">
          <PMText>
            {isCompatibilityDiff
              ? renderDiffText(scalarPayload.oldValue, scalarPayload.newValue)
              : skill.compatibility}
          </PMText>
        </SkillOptionalField>
      )}

      {/* Allowed Tools (optional) */}
      {(skill.allowedTools || isAllowedToolsDiff) && (
        <SkillOptionalField label="Allowed Tools">
          <PMText>
            {isAllowedToolsDiff
              ? renderDiffText(scalarPayload.oldValue, scalarPayload.newValue)
              : skill.allowedTools}
          </PMText>
        </SkillOptionalField>
      )}

      {/* Metadata (optional) */}
      {(skill.metadata || isMetadataDiff) && (
        <SkillOptionalField label="Metadata">
          <PMText>
            {isMetadataDiff
              ? renderDiffText(scalarPayload.oldValue, scalarPayload.newValue)
              : JSON.stringify(skill.metadata, null, 2)}
          </PMText>
        </SkillOptionalField>
      )}

      {/* SKILL.md section */}
      <PMVStack gap={2}>
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
        <PMVStack gap={2}>
          <PMText fontSize="sm" fontWeight="bold" color="secondary">
            Files
          </PMText>
          <PMAccordion.Root
            collapsible
            multiple
            defaultValue={targetFileId ? [targetFileId] : []}
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
