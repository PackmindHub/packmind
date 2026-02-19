import { useMemo, useState } from 'react';
import {
  PMBadge,
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMMarkdownViewer,
  PMSwitch,
  PMText,
  PMTooltip,
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
import { LuCheck, LuCircleAlert, LuUndo2, LuX } from 'react-icons/lu';
import {
  buildBlockedByAcceptedMap,
  buildProposalNumberMap,
  getChangeProposalFieldLabel,
  getStatusBadgeProps,
} from '../../utils/changeProposalHelpers';
import { ConflictWarning } from '../ChangeProposals/ConflictWarning';
import { formatRelativeTime } from '../../utils/formatRelativeTime';
import { ChangeProposalWithConflicts } from '../../types';
import { buildDiffHtml, markdownDiffCss } from '../../utils/markdownDiff';
import {
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../../../shared/components/editor/MarkdownEditor';
import { renderDiffText } from '../../utils/renderDiffText';

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

function renderFileItem(file: SkillFile) {
  return (
    <PMBox
      key={file.id}
      borderRadius="md"
      border="1px solid"
      borderColor="border.primary"
      p={3}
    >
      <PMVStack gap={1} align="stretch">
        <PMHStack justify="space-between">
          <PMText fontSize="sm" fontWeight="semibold">
            {file.path}
          </PMText>
          <PMText fontSize="xs" color="secondary">
            {file.permissions}
          </PMText>
        </PMHStack>
        {file.isBase64 ? (
          <PMText fontSize="xs" color="secondary">
            Binary file
          </PMText>
        ) : (
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
        )}
      </PMVStack>
    </PMBox>
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
    const statusBadge = getStatusBadgeProps(reviewingProposal.status);
    const isOutdated =
      skill !== undefined &&
      reviewingProposal.artefactVersion !== skill.version;

    const isNameDiff =
      reviewingProposal.type === ChangeProposalType.updateSkillName;
    const isDescriptionDiff =
      reviewingProposal.type === ChangeProposalType.updateSkillDescription;
    const isPromptDiff =
      reviewingProposal.type === ChangeProposalType.updateSkillPrompt;
    const isMetadataDiff =
      reviewingProposal.type === ChangeProposalType.updateSkillMetadata;
    const isLicenseDiff =
      reviewingProposal.type === ChangeProposalType.updateSkillLicense;
    const isCompatibilityDiff =
      reviewingProposal.type === ChangeProposalType.updateSkillCompatibility;
    const isAllowedToolsDiff =
      reviewingProposal.type === ChangeProposalType.updateSkillAllowedTools;
    const isAddFile =
      reviewingProposal.type === ChangeProposalType.addSkillFile;
    const isUpdateFileContent =
      reviewingProposal.type === ChangeProposalType.updateSkillFileContent;
    const isUpdateFilePermissions =
      reviewingProposal.type === ChangeProposalType.updateSkillFilePermissions;
    const isDeleteFile =
      reviewingProposal.type === ChangeProposalType.deleteSkillFile;

    const isMarkdownDiff = isDescriptionDiff || isPromptDiff;
    const scalarPayload = reviewingProposal.payload as ScalarUpdatePayload;

    return (
      <PMVStack gap={4} align="stretch">
        {/* Header card */}
        <PMBox
          borderRadius="md"
          border="1px solid"
          borderColor="border.primary"
          p={4}
        >
          <PMVStack gap={3}>
            <PMHStack justify="space-between" align="center" width="full">
              <PMHStack gap={3} align="center">
                {isOutdated ? (
                  <PMTooltip label="This proposal was made on an outdated version">
                    <PMBadge colorPalette="orange" variant="subtle" size="sm">
                      <PMIcon>
                        <LuCircleAlert />
                      </PMIcon>
                      Outdated
                    </PMBadge>
                  </PMTooltip>
                ) : (
                  <PMBadge colorPalette={statusBadge.colorPalette} size="sm">
                    {statusBadge.label}
                  </PMBadge>
                )}
                <PMText fontSize="sm" color="secondary">
                  #{proposalNumberMap.get(reviewingProposal.id)} -{' '}
                  {formatRelativeTime(reviewingProposal.createdAt)}
                </PMText>
              </PMHStack>
              <PMHStack gap={6} align="center">
                {isMarkdownDiff && (
                  <PMHStack gap={2} align="center">
                    <PMText
                      fontSize="sm"
                      color={showPreview ? 'faded' : 'primary'}
                    >
                      Diff
                    </PMText>
                    <PMSwitch
                      size="sm"
                      checked={showPreview}
                      onCheckedChange={(e) => setShowPreview(e.checked)}
                      css={{
                        '& span[data-scope="switch"][data-part="control"]': {
                          bg: 'background.primary',
                        },
                      }}
                    />
                    <PMText
                      fontSize="sm"
                      color={showPreview ? 'primary' : 'faded'}
                    >
                      Preview
                    </PMText>
                  </PMHStack>
                )}
                {acceptedProposalIds.has(reviewingProposal.id) ||
                rejectedProposalIds.has(reviewingProposal.id) ? (
                  <PMButton
                    size="sm"
                    variant="outline"
                    onClick={() => onUndoPool(reviewingProposal.id)}
                  >
                    <LuUndo2 />
                    Undo
                  </PMButton>
                ) : (
                  <PMHStack gap={2}>
                    <PMButton
                      size="xs"
                      variant="secondary"
                      disabled={
                        isOutdated ||
                        blockedByConflictIds.has(reviewingProposal.id)
                      }
                      onClick={() => onPoolAccept(reviewingProposal.id)}
                    >
                      <LuCheck />
                      Accept
                    </PMButton>
                    <PMButton
                      size="xs"
                      variant="secondary"
                      onClick={() => onPoolReject(reviewingProposal.id)}
                    >
                      <LuX />
                      Dismiss
                    </PMButton>
                  </PMHStack>
                )}
              </PMHStack>
            </PMHStack>
            {blockedByConflictIds.has(reviewingProposal.id) &&
              (() => {
                const acceptedIds = blockedByAcceptedMap.get(
                  reviewingProposal.id,
                );
                if (!acceptedIds || acceptedIds.length === 0) return null;
                const conflictingAcceptedNumbers = acceptedIds
                  .map((id) => ({ id, number: proposalNumberMap.get(id) ?? 0 }))
                  .sort((a, b) => a.number - b.number);
                return (
                  <ConflictWarning
                    conflictingAcceptedNumbers={conflictingAcceptedNumbers}
                    onSelectConflicting={onSelectProposal}
                  />
                );
              })()}
            <PMVStack gap={1} align="stretch" width="full">
              <PMText fontWeight="bold" fontSize="sm">
                {getChangeProposalFieldLabel(reviewingProposal.type)}
              </PMText>
              <PMHStack gap={1}>
                <PMText fontWeight="bold" fontSize="sm">
                  From
                </PMText>
                <PMText fontSize="sm">
                  {userLookup.get(reviewingProposal.createdBy) ??
                    'Unknown user'}
                </PMText>
              </PMHStack>
              <PMHStack gap={1}>
                <PMText fontWeight="bold" fontSize="sm">
                  Base version
                </PMText>
                <PMText fontSize="sm">
                  {reviewingProposal.artefactVersion}
                </PMText>
              </PMHStack>
            </PMVStack>
          </PMVStack>
        </PMBox>

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
            <PMVStack gap={1}>
              <PMText fontSize="sm" fontWeight="bold" color="secondary">
                Description
              </PMText>
              {isDescriptionDiff && !showPreview ? (
                <PMBox padding="60px 68px" css={markdownDiffCss}>
                  <PMMarkdownViewer
                    htmlContent={buildDiffHtml(
                      scalarPayload.oldValue,
                      scalarPayload.newValue,
                    )}
                  />
                </PMBox>
              ) : isDescriptionDiff && showPreview ? (
                <MarkdownEditorProvider>
                  <MarkdownEditor
                    defaultValue={scalarPayload.newValue}
                    readOnly
                  />
                </MarkdownEditorProvider>
              ) : (
                <MarkdownEditorProvider>
                  <MarkdownEditor defaultValue={skill.description} readOnly />
                </MarkdownEditorProvider>
              )}
            </PMVStack>

            {/* Prompt */}
            <PMVStack gap={1}>
              <PMText fontSize="sm" fontWeight="bold" color="secondary">
                Prompt
              </PMText>
              {isPromptDiff && !showPreview ? (
                <PMBox padding="60px 68px" css={markdownDiffCss}>
                  <PMMarkdownViewer
                    htmlContent={buildDiffHtml(
                      scalarPayload.oldValue,
                      scalarPayload.newValue,
                    )}
                  />
                </PMBox>
              ) : isPromptDiff && showPreview ? (
                <MarkdownEditorProvider>
                  <MarkdownEditor
                    defaultValue={scalarPayload.newValue}
                    readOnly
                  />
                </MarkdownEditorProvider>
              ) : (
                <MarkdownEditorProvider>
                  <MarkdownEditor defaultValue={skill.prompt} readOnly />
                </MarkdownEditorProvider>
              )}
            </PMVStack>

            {/* License (optional) */}
            {(skill.license || isLicenseDiff) && (
              <PMVStack gap={1}>
                <PMText fontSize="sm" fontWeight="bold" color="secondary">
                  License
                </PMText>
                <PMText>
                  {isLicenseDiff
                    ? renderDiffText(
                        scalarPayload.oldValue,
                        scalarPayload.newValue,
                      )
                    : skill.license}
                </PMText>
              </PMVStack>
            )}

            {/* Compatibility (optional) */}
            {(skill.compatibility || isCompatibilityDiff) && (
              <PMVStack gap={1}>
                <PMText fontSize="sm" fontWeight="bold" color="secondary">
                  Compatibility
                </PMText>
                <PMText>
                  {isCompatibilityDiff
                    ? renderDiffText(
                        scalarPayload.oldValue,
                        scalarPayload.newValue,
                      )
                    : skill.compatibility}
                </PMText>
              </PMVStack>
            )}

            {/* Allowed Tools (optional) */}
            {(skill.allowedTools || isAllowedToolsDiff) && (
              <PMVStack gap={1}>
                <PMText fontSize="sm" fontWeight="bold" color="secondary">
                  Allowed Tools
                </PMText>
                <PMText>
                  {isAllowedToolsDiff
                    ? renderDiffText(
                        scalarPayload.oldValue,
                        scalarPayload.newValue,
                      )
                    : skill.allowedTools}
                </PMText>
              </PMVStack>
            )}

            {/* Metadata (optional) */}
            {(skill.metadata || isMetadataDiff) && (
              <PMVStack gap={1}>
                <PMText fontSize="sm" fontWeight="bold" color="secondary">
                  Metadata
                </PMText>
                <PMText>
                  {isMetadataDiff
                    ? renderDiffText(
                        scalarPayload.oldValue,
                        scalarPayload.newValue,
                      )
                    : JSON.stringify(skill.metadata, null, 2)}
                </PMText>
              </PMVStack>
            )}

            {/* Files section */}
            <PMVStack gap={2}>
              <PMText fontSize="sm" fontWeight="bold" color="secondary">
                Files
              </PMText>
              {files.map((file) => {
                if (isUpdateFileContent) {
                  const payload =
                    reviewingProposal.payload as CollectionItemUpdatePayload<SkillFileId>;
                  if (file.id === payload.targetId) {
                    return (
                      <PMBox
                        key={file.id}
                        borderRadius="md"
                        border="1px solid"
                        borderColor="border.primary"
                        p={3}
                      >
                        <PMVStack gap={1} align="stretch">
                          <PMText fontSize="sm" fontWeight="semibold">
                            {file.path}
                          </PMText>
                          {file.isBase64 ? (
                            <PMText fontSize="sm" color="secondary">
                              Binary file has changed
                            </PMText>
                          ) : (
                            <PMBox padding="16px" css={markdownDiffCss}>
                              <PMMarkdownViewer
                                htmlContent={buildDiffHtml(
                                  payload.oldValue,
                                  payload.newValue,
                                )}
                              />
                            </PMBox>
                          )}
                        </PMVStack>
                      </PMBox>
                    );
                  }
                }

                if (isUpdateFilePermissions) {
                  const payload =
                    reviewingProposal.payload as CollectionItemUpdatePayload<SkillFileId>;
                  if (file.id === payload.targetId) {
                    return (
                      <PMBox
                        key={file.id}
                        borderRadius="md"
                        border="1px solid"
                        borderColor="border.primary"
                        p={3}
                      >
                        <PMVStack gap={1} align="stretch">
                          <PMText fontSize="sm" fontWeight="semibold">
                            {file.path}
                          </PMText>
                          <PMHStack gap={1}>
                            <PMText fontSize="sm" fontWeight="bold">
                              Permissions:
                            </PMText>
                            <PMText fontSize="sm">
                              {renderDiffText(
                                payload.oldValue,
                                payload.newValue,
                              )}
                            </PMText>
                          </PMHStack>
                        </PMVStack>
                      </PMBox>
                    );
                  }
                }

                if (isDeleteFile) {
                  const payload =
                    reviewingProposal.payload as CollectionItemDeletePayload<
                      Omit<SkillFile, 'skillVersionId'>
                    >;
                  if (file.id === payload.targetId) {
                    return (
                      <PMBox
                        key={file.id}
                        borderRadius="md"
                        border="1px solid"
                        borderColor="red.500"
                        bg="red.subtle"
                        p={3}
                        opacity={0.7}
                      >
                        <PMVStack gap={1} align="stretch">
                          <PMText
                            fontSize="sm"
                            fontWeight="semibold"
                            textDecoration="line-through"
                          >
                            {file.path}
                          </PMText>
                        </PMVStack>
                      </PMBox>
                    );
                  }
                }

                return renderFileItem(file);
              })}

              {/* Show new file for addSkillFile */}
              {isAddFile &&
                (() => {
                  const payload =
                    reviewingProposal.payload as CollectionItemAddPayload<
                      Omit<SkillFile, 'skillVersionId'>
                    >;
                  const newFile = payload.item;
                  return (
                    <PMBox
                      key={newFile.id}
                      borderRadius="md"
                      border="1px solid"
                      borderColor="green.500"
                      bg="green.subtle"
                      p={3}
                    >
                      <PMVStack gap={1} align="stretch">
                        <PMHStack justify="space-between">
                          <PMText fontSize="sm" fontWeight="semibold">
                            {newFile.path}
                          </PMText>
                          <PMBadge colorPalette="green" size="sm">
                            New
                          </PMBadge>
                        </PMHStack>
                        {newFile.isBase64 ? (
                          <PMText fontSize="xs" color="secondary">
                            Binary file
                          </PMText>
                        ) : (
                          <PMBox
                            as="pre"
                            fontSize="xs"
                            overflow="auto"
                            maxHeight="200px"
                            p={2}
                            borderRadius="sm"
                            bg="background.secondary"
                          >
                            {newFile.content}
                          </PMBox>
                        )}
                      </PMVStack>
                    </PMBox>
                  );
                })()}
            </PMVStack>
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
    <PMVStack gap={4} align="stretch">
      <PMText fontSize="lg" fontWeight="semibold">
        {skill?.name}
      </PMText>

      <PMVStack gap={1}>
        <PMText fontSize="sm" fontWeight="bold" color="secondary">
          Description
        </PMText>
        <MarkdownEditorProvider>
          <MarkdownEditor defaultValue={skill?.description ?? ''} readOnly />
        </MarkdownEditorProvider>
      </PMVStack>

      <PMVStack gap={1}>
        <PMText fontSize="sm" fontWeight="bold" color="secondary">
          Prompt
        </PMText>
        <MarkdownEditorProvider>
          <MarkdownEditor defaultValue={skill?.prompt ?? ''} readOnly />
        </MarkdownEditorProvider>
      </PMVStack>

      {skill?.license && (
        <PMVStack gap={1}>
          <PMText fontSize="sm" fontWeight="bold" color="secondary">
            License
          </PMText>
          <PMText>{skill.license}</PMText>
        </PMVStack>
      )}

      {skill?.compatibility && (
        <PMVStack gap={1}>
          <PMText fontSize="sm" fontWeight="bold" color="secondary">
            Compatibility
          </PMText>
          <PMText>{skill.compatibility}</PMText>
        </PMVStack>
      )}

      {skill?.allowedTools && (
        <PMVStack gap={1}>
          <PMText fontSize="sm" fontWeight="bold" color="secondary">
            Allowed Tools
          </PMText>
          <PMText>{skill.allowedTools}</PMText>
        </PMVStack>
      )}

      {skill?.metadata && (
        <PMVStack gap={1}>
          <PMText fontSize="sm" fontWeight="bold" color="secondary">
            Metadata
          </PMText>
          <PMText>{JSON.stringify(skill.metadata, null, 2)}</PMText>
        </PMVStack>
      )}

      <PMVStack gap={2}>
        <PMText fontSize="sm" fontWeight="bold" color="secondary">
          Files
        </PMText>
        {files.map((file) => renderFileItem(file))}
      </PMVStack>
    </PMVStack>
  );
}
