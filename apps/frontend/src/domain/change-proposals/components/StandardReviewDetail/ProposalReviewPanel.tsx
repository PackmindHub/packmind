import { useMemo, useState } from 'react';
import { PMBox, PMMarkdownViewer, PMText, PMVStack } from '@packmind/ui';
import {
  ChangeProposalId,
  ChangeProposalType,
  Standard,
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
  selectedStandard: Standard | undefined;
  selectedStandardProposals: ChangeProposalWithConflicts[];
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
  selectedStandard,
  selectedStandardProposals,
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
    () => buildProposalNumberMap(selectedStandardProposals),
    [selectedStandardProposals],
  );

  const blockedByAcceptedMap = useMemo(
    () =>
      buildBlockedByAcceptedMap(selectedStandardProposals, acceptedProposalIds),
    [selectedStandardProposals, acceptedProposalIds],
  );

  const reviewingProposal = reviewingProposalId
    ? (selectedStandardProposals.find((p) => p.id === reviewingProposalId) ??
      null)
    : null;

  if (reviewingProposal) {
    const payload = reviewingProposal.payload as ScalarUpdatePayload;
    const isOutdated =
      selectedStandard !== undefined &&
      reviewingProposal.artefactVersion !== selectedStandard.version;

    const isNameDiff =
      reviewingProposal.type === ChangeProposalType.updateStandardName;
    const isDescriptionDiff =
      reviewingProposal.type === ChangeProposalType.updateStandardDescription;

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
        {selectedStandard && (
          <PMVStack gap={2} align="stretch">
            <PMText fontSize="lg" fontWeight="semibold">
              {isNameDiff
                ? renderDiffText(payload.oldValue, payload.newValue)
                : selectedStandard.name}
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
                  defaultValue={selectedStandard.description}
                  readOnly
                />
              </MarkdownEditorProvider>
            )}
          </PMVStack>
        )}
      </PMVStack>
    );
  }

  if (!selectedStandard) {
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
        {selectedStandard.name}
      </PMText>
      <MarkdownEditorProvider>
        <MarkdownEditor defaultValue={selectedStandard.description} readOnly />
      </MarkdownEditorProvider>
    </PMVStack>
  );
}
