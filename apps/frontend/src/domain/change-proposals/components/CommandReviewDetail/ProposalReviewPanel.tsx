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
        />

        {/* Full artefact content with inline diff */}
        {selectedRecipe && (
          <PMVStack gap={2} align="stretch">
            <PMText fontSize="lg" fontWeight="semibold">
              {isNameDiff
                ? renderDiffText(payload.oldValue, payload.newValue)
                : selectedRecipe.name}
            </PMText>
            {isDescriptionDiff && !showPreview ? (
              <PMBox padding="60px 68px" css={markdownDiffCss}>
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
