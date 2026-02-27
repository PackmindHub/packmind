import { useMemo, useState } from 'react';
import { PMBox, PMText, PMVStack } from '@packmind/ui';
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
import {
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../../../shared/components/editor/MarkdownEditor';
import { renderDiffText } from '../../utils/renderDiffText';
import { ProposalReviewHeader } from '../ProposalReviewHeader';
import { useDiffNavigation } from '../../hooks/useDiffNavigation';
import { renderMarkdownDiffOrPreview } from '../SkillReviewDetail/SkillContent/renderMarkdownDiffOrPreview';
import { applyRecipeProposals } from '../../utils/applyRecipeProposals';
import { getProposalNumbers } from '../../utils/applyStandardProposals';
import { HighlightedText } from '../HighlightedContent';
import { UnifiedMarkdownViewer } from '../UnifiedMarkdownViewer';

interface ProposalReviewPanelProps {
  selectedRecipe: Recipe | undefined;
  selectedRecipeProposals: ChangeProposalWithConflicts[];
  reviewingProposalId: ChangeProposalId | null;
  outdatedProposalIds: Set<ChangeProposalId>;
  acceptedProposalIds: Set<ChangeProposalId>;
  rejectedProposalIds: Set<ChangeProposalId>;
  blockedByConflictIds: Set<ChangeProposalId>;
  userLookup: Map<UserId, string>;
  showUnifiedView: boolean;
  onSelectProposal: (proposalId: ChangeProposalId) => void;
  onPoolAccept: (proposalId: ChangeProposalId) => void;
  onPoolReject: (proposalId: ChangeProposalId) => void;
  onUndoPool: (proposalId: ChangeProposalId) => void;
}

export function ProposalReviewPanel({
  selectedRecipe,
  selectedRecipeProposals,
  reviewingProposalId,
  outdatedProposalIds,
  acceptedProposalIds,
  rejectedProposalIds,
  blockedByConflictIds,
  userLookup,
  showUnifiedView,
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

  const unifiedResult = useMemo(() => {
    if (
      !showUnifiedView ||
      !selectedRecipe ||
      acceptedProposalIds.size === 0 ||
      reviewingProposal
    ) {
      return null;
    }
    return applyRecipeProposals(
      selectedRecipe,
      selectedRecipeProposals,
      acceptedProposalIds,
    );
  }, [
    showUnifiedView,
    selectedRecipe,
    selectedRecipeProposals,
    acceptedProposalIds,
    reviewingProposal,
  ]);

  if (reviewingProposal) {
    const payload = reviewingProposal.payload as ScalarUpdatePayload;
    const isOutdated = outdatedProposalIds.has(reviewingProposal.id);

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
            <PMVStack
              gap={1}
              align="stretch"
              {...(isDescriptionDiff && { 'data-diff-section': true })}
            >
              {renderMarkdownDiffOrPreview(
                isDescriptionDiff,
                showPreview,
                payload,
                selectedRecipe.content,
                {
                  previewPaddingVariant: 'none',
                  defaultPaddingVariant: 'none',
                },
              )}
            </PMVStack>
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
      {unifiedResult ? (
        <>
          {unifiedResult.changes.name ? (
            <HighlightedText
              oldValue={unifiedResult.changes.name.originalValue}
              newValue={unifiedResult.changes.name.finalValue}
              proposalNumbers={getProposalNumbers(
                unifiedResult.changes.name.proposalIds,
                selectedRecipeProposals,
              )}
            >
              <PMText fontSize="lg" fontWeight="semibold">
                {unifiedResult.name}
              </PMText>
            </HighlightedText>
          ) : (
            <PMText fontSize="lg" fontWeight="semibold">
              {unifiedResult.name}
            </PMText>
          )}

          {unifiedResult.changes.content ? (
            <UnifiedMarkdownViewer
              oldValue={unifiedResult.changes.content.originalValue}
              newValue={unifiedResult.changes.content.finalValue}
              proposalNumbers={getProposalNumbers(
                unifiedResult.changes.content.proposalIds,
                selectedRecipeProposals,
              )}
            />
          ) : (
            <MarkdownEditorProvider>
              <MarkdownEditor
                defaultValue={unifiedResult.content}
                readOnly
                paddingVariant="none"
              />
            </MarkdownEditorProvider>
          )}
        </>
      ) : (
        <>
          <PMText fontSize="lg" fontWeight="semibold">
            {selectedRecipe.name}
          </PMText>
          <MarkdownEditorProvider>
            <MarkdownEditor
              defaultValue={selectedRecipe.content}
              readOnly
              paddingVariant="none"
            />
          </MarkdownEditorProvider>
        </>
      )}
    </PMVStack>
  );
}
