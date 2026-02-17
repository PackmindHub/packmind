import { PMBox, PMVStack, PMText } from '@packmind/ui';
import { ChangeProposalId, ChangeProposalType } from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { InlineDiffContent } from '../InlineDiffContent';

interface ChangeProposalsPreviewPanelProps {
  recipe: { name: string; content: string } | null;
  proposals: ChangeProposalWithConflicts[];
  reviewingProposalId: ChangeProposalId | null;
  acceptedProposalIds: Set<ChangeProposalId>;
  rejectedProposalIds: Set<ChangeProposalId>;
  onPoolAccept: (proposalId: ChangeProposalId) => void;
  onPoolReject: (proposalId: ChangeProposalId) => void;
  onUndoPool: (proposalId: ChangeProposalId) => void;
  onReviewProposal: (proposalId: ChangeProposalId) => void;
}

export function ChangeProposalsPreviewPanel({
  recipe,
  proposals,
  reviewingProposalId,
  acceptedProposalIds,
  rejectedProposalIds,
  onPoolAccept,
  onPoolReject,
  onUndoPool,
  onReviewProposal,
}: Readonly<ChangeProposalsPreviewPanelProps>) {
  if (!recipe) {
    return (
      <PMBox
        display="flex"
        alignItems="center"
        justifyContent="center"
        height="full"
      >
        <PMText>Click on a proposal to preview the change</PMText>
      </PMBox>
    );
  }

  const nameProposals = proposals.filter(
    (p) => p.type === ChangeProposalType.updateCommandName,
  );
  const descriptionProposals = proposals.filter(
    (p) => p.type === ChangeProposalType.updateCommandDescription,
  );

  return (
    <PMVStack gap={4} align="stretch">
      <PMBox>
        {nameProposals.length > 0 ? (
          <PMVStack gap={2} align="stretch">
            <PMText fontSize="lg" fontWeight="semibold" color="secondary">
              {recipe.name}
            </PMText>
            {nameProposals.map((proposal) => (
              <InlineDiffContent
                key={proposal.id}
                proposal={proposal}
                isReviewing={reviewingProposalId === proposal.id}
                isAccepted={acceptedProposalIds.has(proposal.id)}
                isRejected={rejectedProposalIds.has(proposal.id)}
                onPoolAccept={() => onPoolAccept(proposal.id)}
                onPoolReject={() => onPoolReject(proposal.id)}
                onUndoPool={() => onUndoPool(proposal.id)}
                onReviewProposal={() => onReviewProposal(proposal.id)}
              />
            ))}
          </PMVStack>
        ) : (
          <PMText fontSize="lg" fontWeight="semibold">
            {recipe.name}
          </PMText>
        )}
      </PMBox>

      <PMBox>
        {descriptionProposals.length > 0 ? (
          <PMVStack gap={3} align="stretch">
            <PMText whiteSpace="pre-wrap" color="secondary">
              {recipe.content}
            </PMText>
            <PMText fontSize="sm" fontWeight="medium" color="secondary">
              Proposed changes:
            </PMText>
            {descriptionProposals.map((proposal) => (
              <InlineDiffContent
                key={proposal.id}
                proposal={proposal}
                isReviewing={reviewingProposalId === proposal.id}
                isAccepted={acceptedProposalIds.has(proposal.id)}
                isRejected={rejectedProposalIds.has(proposal.id)}
                onPoolAccept={() => onPoolAccept(proposal.id)}
                onPoolReject={() => onPoolReject(proposal.id)}
                onUndoPool={() => onUndoPool(proposal.id)}
                onReviewProposal={() => onReviewProposal(proposal.id)}
              />
            ))}
          </PMVStack>
        ) : (
          <PMText whiteSpace="pre-wrap">{recipe.content}</PMText>
        )}
      </PMBox>
    </PMVStack>
  );
}
