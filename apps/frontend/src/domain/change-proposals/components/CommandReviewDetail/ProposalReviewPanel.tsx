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
  Recipe,
  ScalarUpdatePayload,
  UserId,
} from '@packmind/types';
import { diffWords } from 'diff';
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
import { buildDiffHtml } from '../../utils/markdownDiff';
import {
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../../../shared/components/editor/MarkdownEditor';

function renderDiffText(oldValue: string, newValue: string) {
  const changes = diffWords(oldValue, newValue);
  return changes.map((change, i) => {
    if (change.added) {
      return (
        <PMText
          key={i}
          as="span"
          bg="green.subtle"
          paddingX={0.5}
          borderRadius="sm"
        >
          {change.value}
        </PMText>
      );
    }
    if (change.removed) {
      return (
        <PMText
          key={i}
          as="span"
          bg="red.subtle"
          textDecoration="line-through"
          paddingX={0.5}
          borderRadius="sm"
        >
          {change.value}
        </PMText>
      );
    }
    return (
      <PMText key={i} as="span">
        {change.value}
      </PMText>
    );
  });
}

interface ProposalReviewPanelProps {
  selectedRecipe: Recipe | undefined;
  selectedRecipeProposals: ChangeProposalWithConflicts[];
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

export function ProposalReviewPanel({
  selectedRecipe,
  selectedRecipeProposals,
  reviewingProposalId,
  acceptedProposalIds,
  rejectedProposalIds,
  blockedByConflictIds,
  userLookup,
  onSelectProposal,
  onPoolAccept,
  onPoolReject,
  onUndoPool,
}: Readonly<ProposalReviewPanelProps>) {
  const [showPreview, setShowPreview] = useState(false);

  const proposalNumberMap = useMemo(
    () => buildProposalNumberMap(selectedRecipeProposals),
    [selectedRecipeProposals],
  );

  const blockedByAcceptedMap = useMemo(
    () =>
      buildBlockedByAcceptedMap(selectedRecipeProposals, acceptedProposalIds),
    [selectedRecipeProposals, acceptedProposalIds],
  );

  const reviewingProposal = reviewingProposalId
    ? (selectedRecipeProposals.find((p) => p.id === reviewingProposalId) ??
      null)
    : null;

  if (reviewingProposal) {
    const statusBadge = getStatusBadgeProps(reviewingProposal.status);
    const payload = reviewingProposal.payload as ScalarUpdatePayload;
    const isOutdated =
      selectedRecipe !== undefined &&
      reviewingProposal.artefactVersion !== selectedRecipe.version;

    const isNameDiff =
      reviewingProposal.type === ChangeProposalType.updateCommandName;
    const isDescriptionDiff =
      reviewingProposal.type === ChangeProposalType.updateCommandDescription;

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
                {isDescriptionDiff && (
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

        {/* Full artefact content with inline diff */}
        {selectedRecipe && (
          <PMVStack gap={2} align="stretch">
            <PMText fontSize="lg" fontWeight="semibold">
              {isNameDiff
                ? renderDiffText(payload.oldValue, payload.newValue)
                : selectedRecipe.name}
            </PMText>
            {isDescriptionDiff && !showPreview ? (
              <PMBox
                padding="60px 68px"
                css={{
                  '& ins': {
                    backgroundColor: 'var(--Palette-Semantic-Green800)',
                    padding: '0 2px',
                    borderRadius: '2px',
                    textDecoration: 'none',
                  },
                  '& del': {
                    backgroundColor: 'var(--Palette-Semantic-Red800)',
                    padding: '0 2px',
                    borderRadius: '2px',
                  },
                }}
              >
                <PMMarkdownViewer
                  htmlContent={buildDiffHtml(
                    payload.oldValue,
                    payload.newValue,
                  )}
                />
              </PMBox>
            ) : isDescriptionDiff && showPreview ? (
              <MarkdownEditorProvider>
                <MarkdownEditor defaultValue={payload.newValue} readOnly />
              </MarkdownEditorProvider>
            ) : (
              <MarkdownEditorProvider>
                <MarkdownEditor
                  defaultValue={selectedRecipe.content}
                  readOnly
                />
              </MarkdownEditorProvider>
            )}
          </PMVStack>
        )}
      </PMVStack>
    );
  }

  if (!selectedRecipe) {
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

  return (
    <PMVStack gap={2} align="stretch">
      <PMText fontSize="lg" fontWeight="semibold">
        {selectedRecipe.name}
      </PMText>
      <MarkdownEditorProvider>
        <MarkdownEditor defaultValue={selectedRecipe.content} readOnly />
      </MarkdownEditorProvider>
    </PMVStack>
  );
}
