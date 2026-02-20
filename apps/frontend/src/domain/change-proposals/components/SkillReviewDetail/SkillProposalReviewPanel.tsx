import { ReactNode, useMemo, useState } from 'react';
import {
  PMAccordion,
  PMBadge,
  PMBox,
  PMHStack,
  PMMarkdownViewer,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  ChangeProposalId,
  ChangeProposalType,
  CollectionItemAddPayload,
  CollectionItemDeletePayload,
  CollectionItemUpdatePayload,
  ScalarUpdatePayload,
  SkillFile,
  SkillFileId,
  SkillWithFiles,
  UserId,
} from '@packmind/types';
import {
  buildBlockedByAcceptedMap,
  buildProposalNumberMap,
} from '../../utils/changeProposalHelpers';
import { ChangeProposalWithConflicts } from '../../types';
import { buildDiffHtml, markdownDiffCss } from '../../utils/markdownDiff';
import {
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../../../shared/components/editor/MarkdownEditor';
import { renderDiffText } from '../../utils/renderDiffText';
import { ProposalReviewHeader } from '../ProposalReviewHeader';

interface SkillProposalReviewPanelProps {
  selectedSkill: SkillWithFiles | undefined;
  selectedSkillProposals: ChangeProposalWithConflicts[];
  reviewingProposalId: ChangeProposalId | null;
  acceptedProposalIds: Set<ChangeProposalId>;
  rejectedProposalIds: Set<ChangeProposalId>;
  blockedByConflictIds: Set<ChangeProposalId>;
  userLookup: Map<UserId, string>;
  onSelectProposal: (proposalId: ChangeProposalId) => void;
  onPoolAccept: (proposalId: ChangeProposalId) => void;
  onPoolReject: (proposalId: ChangeProposalId) => void;
  onUndoPool: (proposalId: ChangeProposalId) => void;
}

const markdownExtensions = ['.md', '.mdx', '.mdc'];

function renderMarkdownDiffOrPreview(
  isDiff: boolean,
  showPreview: boolean,
  payload: ScalarUpdatePayload,
  currentValue: string,
  options?: {
    diffBoxPadding?: string;
    previewPaddingVariant?: 'none';
    defaultPaddingVariant?: 'none';
  },
) {
  if (isDiff && !showPreview) {
    return (
      <PMBox padding={options?.diffBoxPadding} css={markdownDiffCss}>
        <PMMarkdownViewer
          htmlContent={buildDiffHtml(payload.oldValue, payload.newValue)}
        />
      </PMBox>
    );
  }
  const value = isDiff ? payload.newValue : currentValue;
  const paddingVariant = isDiff
    ? options?.previewPaddingVariant
    : options?.defaultPaddingVariant;
  return (
    <MarkdownEditorProvider>
      <MarkdownEditor
        defaultValue={value}
        readOnly
        paddingVariant={paddingVariant}
      />
    </MarkdownEditorProvider>
  );
}

function FileContent({
  file,
}: {
  file: Pick<SkillFile, 'isBase64' | 'path' | 'content'>;
}) {
  if (file.isBase64) {
    return (
      <PMText fontSize="xs" color="secondary">
        Binary file
      </PMText>
    );
  }
  if (markdownExtensions.some((ext) => file.path.toLowerCase().endsWith(ext))) {
    return (
      <PMBox p={4}>
        <PMMarkdownViewer content={file.content} />
      </PMBox>
    );
  }
  return (
    <PMBox
      as="pre"
      fontSize="xs"
      overflow="auto"
      maxHeight="200px"
      p={2}
      borderRadius="sm"
      bg="background.secondary"
    >
      {file.content}
    </PMBox>
  );
}

function FileAccordionItem({ file }: { file: SkillFile }) {
  return (
    <PMAccordion.Item
      key={file.id}
      value={file.id}
      borderRadius="md"
      border="1px solid"
      borderColor="border.primary"
    >
      <PMAccordion.ItemTrigger cursor="pointer" bg="background.primary" px={2}>
        <PMAccordion.ItemIndicator />
        <PMHStack justify="space-between" width="full">
          <PMText fontSize="sm" fontWeight="semibold">
            {file.path}
          </PMText>
          <PMText fontSize="xs" color="secondary">
            {file.permissions}
          </PMText>
        </PMHStack>
      </PMAccordion.ItemTrigger>
      <PMAccordion.ItemContent>
        <FileContent file={file} />
      </PMAccordion.ItemContent>
    </PMAccordion.Item>
  );
}

function UpdatedFileContentItem({
  file,
  payload,
}: {
  file: SkillFile;
  payload: CollectionItemUpdatePayload<SkillFileId>;
}) {
  return (
    <PMAccordion.Item
      key={file.id}
      value={file.id}
      borderRadius="md"
      border="1px solid"
      borderColor="border.primary"
    >
      <PMAccordion.ItemTrigger cursor="pointer" bg="background.primary" px={2}>
        <PMAccordion.ItemIndicator />
        <PMText fontSize="sm" fontWeight="semibold">
          {file.path}
        </PMText>
      </PMAccordion.ItemTrigger>
      <PMAccordion.ItemContent>
        {file.isBase64 ? (
          <PMText fontSize="sm" color="secondary">
            Binary file has changed
          </PMText>
        ) : (
          <PMBox padding="16px" css={markdownDiffCss}>
            <PMMarkdownViewer
              htmlContent={buildDiffHtml(payload.oldValue, payload.newValue)}
            />
          </PMBox>
        )}
      </PMAccordion.ItemContent>
    </PMAccordion.Item>
  );
}

function UpdatedFilePermissionsItem({
  file,
  payload,
}: {
  file: SkillFile;
  payload: CollectionItemUpdatePayload<SkillFileId>;
}) {
  return (
    <PMAccordion.Item
      key={file.id}
      value={file.id}
      borderRadius="md"
      border="1px solid"
      borderColor="border.primary"
    >
      <PMAccordion.ItemTrigger cursor="pointer" bg="background.primary" px={2}>
        <PMAccordion.ItemIndicator />
        <PMText fontSize="sm" fontWeight="semibold">
          {file.path}
        </PMText>
      </PMAccordion.ItemTrigger>
      <PMAccordion.ItemContent>
        <PMHStack gap={1}>
          <PMText fontSize="sm" fontWeight="bold">
            Permissions:
          </PMText>
          <PMText fontSize="sm">
            {renderDiffText(payload.oldValue, payload.newValue)}
          </PMText>
        </PMHStack>
      </PMAccordion.ItemContent>
    </PMAccordion.Item>
  );
}

function DeletedFileItem({ file }: { file: SkillFile }) {
  return (
    <PMAccordion.Item
      key={file.id}
      value={file.id}
      borderRadius="md"
      border="1px solid"
      borderColor="red.500"
      bg="red.subtle"
      opacity={0.7}
    >
      <PMAccordion.ItemTrigger cursor="pointer" bg="background.primary" px={2}>
        <PMAccordion.ItemIndicator />
        <PMText
          fontSize="sm"
          fontWeight="semibold"
          textDecoration="line-through"
        >
          {file.path}
        </PMText>
      </PMAccordion.ItemTrigger>
    </PMAccordion.Item>
  );
}

function AddedFileItem({
  payload,
}: {
  payload: CollectionItemAddPayload<Omit<SkillFile, 'skillVersionId'>>;
}) {
  const newFile = payload.item;
  return (
    <PMAccordion.Item
      key={newFile.id}
      value={newFile.id}
      borderRadius="md"
      border="1px solid"
      borderColor="green.500"
      bg="green.subtle"
    >
      <PMAccordion.ItemTrigger cursor="pointer" bg="background.primary" px={2}>
        <PMAccordion.ItemIndicator />
        <PMHStack justify="space-between" width="full">
          <PMText fontSize="sm" fontWeight="semibold">
            {newFile.path}
          </PMText>
          <PMBadge colorPalette="green" size="sm">
            New
          </PMBadge>
        </PMHStack>
      </PMAccordion.ItemTrigger>
      <PMAccordion.ItemContent>
        <FileContent file={newFile} />
      </PMAccordion.ItemContent>
    </PMAccordion.Item>
  );
}

function SkillOptionalField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <PMVStack gap={1}>
      <PMText fontSize="sm" fontWeight="bold" color="secondary">
        {label}
      </PMText>
      {children}
    </PMVStack>
  );
}

export function SkillProposalReviewPanel({
  selectedSkill,
  selectedSkillProposals,
  reviewingProposalId,
  acceptedProposalIds,
  rejectedProposalIds,
  blockedByConflictIds,
  userLookup,
  onSelectProposal,
  onPoolAccept,
  onPoolReject,
  onUndoPool,
}: Readonly<SkillProposalReviewPanelProps>) {
  const [showPreview, setShowPreview] = useState(false);

  const proposalNumberMap = useMemo(
    () => buildProposalNumberMap(selectedSkillProposals),
    [selectedSkillProposals],
  );

  const blockedByAcceptedMap = useMemo(
    () =>
      buildBlockedByAcceptedMap(selectedSkillProposals, acceptedProposalIds),
    [selectedSkillProposals, acceptedProposalIds],
  );

  const reviewingProposal = reviewingProposalId
    ? (selectedSkillProposals.find((p) => p.id === reviewingProposalId) ?? null)
    : null;

  const skill = selectedSkill?.skill;
  const files = selectedSkill?.files ?? [];

  if (reviewingProposal) {
    const isOutdated =
      skill !== undefined &&
      reviewingProposal.artefactVersion !== skill.version;

    const proposalTypeFlags = {
      isNameDiff: reviewingProposal.type === ChangeProposalType.updateSkillName,
      isDescriptionDiff:
        reviewingProposal.type === ChangeProposalType.updateSkillDescription,
      isPromptDiff:
        reviewingProposal.type === ChangeProposalType.updateSkillPrompt,
      isMetadataDiff:
        reviewingProposal.type === ChangeProposalType.updateSkillMetadata,
      isLicenseDiff:
        reviewingProposal.type === ChangeProposalType.updateSkillLicense,
      isCompatibilityDiff:
        reviewingProposal.type === ChangeProposalType.updateSkillCompatibility,
      isAllowedToolsDiff:
        reviewingProposal.type === ChangeProposalType.updateSkillAllowedTools,
      isAddFile: reviewingProposal.type === ChangeProposalType.addSkillFile,
      isUpdateFileContent:
        reviewingProposal.type === ChangeProposalType.updateSkillFileContent,
      isUpdateFilePermissions:
        reviewingProposal.type ===
        ChangeProposalType.updateSkillFilePermissions,
      isDeleteFile:
        reviewingProposal.type === ChangeProposalType.deleteSkillFile,
    } as const;

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

    const isMarkdownDiff = isDescriptionDiff || isPromptDiff;
    const scalarPayload = reviewingProposal.payload as ScalarUpdatePayload;

    const targetFileId = (() => {
      if (isUpdateFileContent || isUpdateFilePermissions) {
        return (
          reviewingProposal.payload as CollectionItemUpdatePayload<SkillFileId>
        ).targetId;
      }
      if (isDeleteFile) {
        return (
          reviewingProposal.payload as CollectionItemDeletePayload<
            Omit<SkillFile, 'skillVersionId'>
          >
        ).targetId;
      }
      if (isAddFile) {
        return (
          reviewingProposal.payload as CollectionItemAddPayload<
            Omit<SkillFile, 'skillVersionId'>
          >
        ).item.id;
      }
      return undefined;
    })();

    return (
      <PMVStack gap={4} align="stretch">
        <ProposalReviewHeader
          proposal={reviewingProposal}
          isOutdated={isOutdated}
          proposalNumberMap={proposalNumberMap}
          acceptedProposalIds={acceptedProposalIds}
          rejectedProposalIds={rejectedProposalIds}
          blockedByConflictIds={blockedByConflictIds}
          blockedByAcceptedMap={blockedByAcceptedMap}
          userLookup={userLookup}
          showDiffPreviewToggle={isMarkdownDiff}
          showPreview={showPreview}
          onPreviewChange={setShowPreview}
          onSelectProposal={onSelectProposal}
          onPoolAccept={onPoolAccept}
          onPoolReject={onPoolReject}
          onUndoPool={onUndoPool}
        />

        {/* Full skill context with inline diff */}
        {skill && (
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
                    ? renderDiffText(
                        scalarPayload.oldValue,
                        scalarPayload.newValue,
                      )
                    : skill.license}
                </PMText>
              </SkillOptionalField>
            )}

            {/* Compatibility (optional) */}
            {(skill.compatibility || isCompatibilityDiff) && (
              <SkillOptionalField label="Compatibility">
                <PMText>
                  {isCompatibilityDiff
                    ? renderDiffText(
                        scalarPayload.oldValue,
                        scalarPayload.newValue,
                      )
                    : skill.compatibility}
                </PMText>
              </SkillOptionalField>
            )}

            {/* Allowed Tools (optional) */}
            {(skill.allowedTools || isAllowedToolsDiff) && (
              <SkillOptionalField label="Allowed Tools">
                <PMText>
                  {isAllowedToolsDiff
                    ? renderDiffText(
                        scalarPayload.oldValue,
                        scalarPayload.newValue,
                      )
                    : skill.allowedTools}
                </PMText>
              </SkillOptionalField>
            )}

            {/* Metadata (optional) */}
            {(skill.metadata || isMetadataDiff) && (
              <SkillOptionalField label="Metadata">
                <PMText>
                  {isMetadataDiff
                    ? renderDiffText(
                        scalarPayload.oldValue,
                        scalarPayload.newValue,
                      )
                    : JSON.stringify(skill.metadata, null, 2)}
                </PMText>
              </SkillOptionalField>
            )}

            {/* SKILL.md section */}
            <PMVStack gap={2}>
              <PMText fontSize="sm" fontWeight="bold" color="secondary">
                SKILL.md
              </PMText>
              <PMAccordion.Root
                collapsible
                multiple
                defaultValue={['SKILL.md']}
              >
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
                  <PMAccordion.ItemContent>
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
                    if (isUpdateFileContent) {
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
                    if (isUpdateFilePermissions) {
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
                    if (isDeleteFile) {
                      const deletePayload =
                        reviewingProposal.payload as CollectionItemDeletePayload<
                          Omit<SkillFile, 'skillVersionId'>
                        >;
                      if (file.id === deletePayload.targetId)
                        return <DeletedFileItem key={file.id} file={file} />;
                    }
                    return <FileAccordionItem key={file.id} file={file} />;
                  })}
                  {isAddFile && (
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
        )}
      </PMVStack>
    );
  }

  if (!selectedSkill) {
    return (
      <PMBox
        display="flex"
        alignItems="center"
        justifyContent="center"
        height="full"
      >
        <PMText color="secondary">
          Select a proposal to preview the change
        </PMText>
      </PMBox>
    );
  }

  // Read-only full skill view (no proposal selected)
  return (
    <PMVStack gap={4} align="stretch" width="full">
      <PMText fontSize="lg" fontWeight="semibold">
        {skill?.name}
      </PMText>

      <PMVStack gap={1} align="stretch" width="full">
        <MarkdownEditorProvider>
          <MarkdownEditor
            defaultValue={skill?.description ?? ''}
            readOnly
            paddingVariant="none"
          />
        </MarkdownEditorProvider>
      </PMVStack>

      {skill?.license && (
        <SkillOptionalField label="License">
          <PMText>{skill.license}</PMText>
        </SkillOptionalField>
      )}

      {skill?.compatibility && (
        <SkillOptionalField label="Compatibility">
          <PMText>{skill.compatibility}</PMText>
        </SkillOptionalField>
      )}

      {skill?.allowedTools && (
        <SkillOptionalField label="Allowed Tools">
          <PMText>{skill.allowedTools}</PMText>
        </SkillOptionalField>
      )}

      {skill?.metadata && (
        <SkillOptionalField label="Metadata">
          <PMText>{JSON.stringify(skill.metadata, null, 2)}</PMText>
        </SkillOptionalField>
      )}

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
            <PMAccordion.ItemContent p={4}>
              <MarkdownEditorProvider>
                <MarkdownEditor
                  defaultValue={skill?.prompt ?? ''}
                  readOnly
                  paddingVariant="none"
                />
              </MarkdownEditorProvider>
            </PMAccordion.ItemContent>
          </PMAccordion.Item>
        </PMAccordion.Root>
      </PMVStack>

      {files.length > 0 && (
        <PMVStack gap={2}>
          <PMText
            fontSize="sm"
            fontWeight="bold"
            color="secondary"
            width="full"
          >
            Files
          </PMText>
          <PMAccordion.Root collapsible multiple spaceY={2}>
            {files.map((file) => (
              <FileAccordionItem key={file.id} file={file} />
            ))}
          </PMAccordion.Root>
        </PMVStack>
      )}
    </PMVStack>
  );
}
