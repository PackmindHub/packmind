import { useMemo, useState } from 'react';
import { PMBox, PMMarkdownViewer, PMText, PMVStack } from '@packmind/ui';
import {
  ChangeProposalId,
  ChangeProposalType,
  Recipe,
  ScalarUpdatePayload,
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
import { useDiffNavigation } from '../../hooks/useDiffNavigation';

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
  const {
    currentIndex,
    totalChanges,
    hasScroll,
    goToNext,
    goToPrevious,
    scrollToCurrent,
  } = useDiffNavigation(reviewingProposalId);
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
        <ProposalReviewHeader
          proposal={reviewingProposal}
          isOutdated={isOutdated}
          proposalNumberMap={proposalNumberMap}
          acceptedProposalIds={acceptedProposalIds}
          rejectedProposalIds={rejectedProposalIds}
          blockedByConflictIds={blockedByConflictIds}
          blockedByAcceptedMap={blockedByAcceptedMap}
          userLookup={userLookup}
          showDiffPreviewToggle={isDescriptionDiff}
          showPreview={showPreview}
          onPreviewChange={setShowPreview}
          onSelectProposal={onSelectProposal}
          onPoolAccept={onPoolAccept}
          onPoolReject={onPoolReject}
          onUndoPool={onUndoPool}
          diffNavigation={{
            currentIndex,
            totalChanges,
            hasScroll,
            onNext: goToNext,
            onPrevious: goToPrevious,
            onScrollToCurrent: scrollToCurrent,
          }}
        />
        {selectedRecipe && (
          <PMVStack gap={2} align="stretch" px={4} pb={4}>
            <PMText
              fontSize="lg"
              fontWeight="semibold"
              {...(isNameDiff && { 'data-diff-section': true })}
            >
              {isNameDiff
                ? renderDiffText(payload.oldValue, payload.newValue)
                : selectedRecipe.name}
            </PMText>
            {isDescriptionDiff && !showPreview ? (
              <PMBox
                padding="60px 68px"
                css={markdownDiffCss}
                {...(isDescriptionDiff && { 'data-diff-section': true })}
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
        p={4}
      >
        <PMText color="secondary">
          Select a proposal to preview the change
        </PMText>
      </PMBox>
    );
  }

  return (
    <PMVStack gap={2} align="stretch" p={4}>
      <PMText fontSize="lg" fontWeight="semibold">
        {selectedRecipe.name}
      </PMText>
      <MarkdownEditorProvider>
        <MarkdownEditor defaultValue={selectedRecipe.content} readOnly />
      </MarkdownEditorProvider>
    </PMVStack>
  );
}
