import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ChangeProposal,
  ChangeProposalDecision,
  ChangeProposalId,
  ChangeProposalType,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../types';

export function useChangeProposalPool(
  proposals: ChangeProposalWithConflicts[],
) {
  const [reviewingProposalId, setReviewingProposalId] =
    useState<ChangeProposalId | null>(null);
  const [acceptedProposalIds, setAcceptedProposalIds] = useState<
    Set<ChangeProposalId>
  >(new Set());
  const [rejectedProposalIds, setRejectedProposalIds] = useState<
    Set<ChangeProposalId>
  >(new Set());
  const [decisionsTaken, setDecisionsTaken] = useState<
    Record<ChangeProposalId, ChangeProposalDecision>
  >({});

  useEffect(() => {
    const currentIds = new Set(proposals.map((p) => p.id));

    setAcceptedProposalIds((prev) => {
      const next = new Set([...prev].filter((id) => currentIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
    setRejectedProposalIds((prev) => {
      const next = new Set([...prev].filter((id) => currentIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
    setReviewingProposalId((prev) =>
      prev && !currentIds.has(prev) ? null : prev,
    );
  }, [proposals]);

  const blockedByConflictIds = useMemo(() => {
    const blocked = new Set<ChangeProposalId>();
    for (const id of acceptedProposalIds) {
      const proposal = proposals.find((p) => p.id === id);
      if (proposal) {
        for (const conflictId of proposal.conflictsWith) {
          blocked.add(conflictId);
        }
      }
    }
    return blocked;
  }, [acceptedProposalIds, proposals]);

  const hasPooledDecisions =
    acceptedProposalIds.size > 0 || rejectedProposalIds.size > 0;

  const handleSelectProposal = useCallback((proposalId: ChangeProposalId) => {
    setReviewingProposalId((prev) => (prev === proposalId ? null : proposalId));
  }, []);

  const handlePoolAccept = useCallback(
    (proposalId: ChangeProposalId, decision: ChangeProposalDecision) => {
      setAcceptedProposalIds((prev) => {
        const next = new Set(prev);
        next.add(proposalId);
        return next;
      });
      setRejectedProposalIds((prev) => {
        const next = new Set(prev);
        next.delete(proposalId);
        return next;
      });
      setDecisionsTaken((prev) => ({ ...prev, [proposalId]: decision }));
    },
    [],
  );

  const handlePoolReject = useCallback((proposalId: ChangeProposalId) => {
    setRejectedProposalIds((prev) => {
      const next = new Set(prev);
      next.add(proposalId);
      return next;
    });
    setAcceptedProposalIds((prev) => {
      const next = new Set(prev);
      next.delete(proposalId);
      return next;
    });
    setDecisionsTaken((prev) => {
      const { [proposalId]: _, ...rest } = prev;
      return rest as Record<ChangeProposalId, ChangeProposalDecision>;
    });
  }, []);

  const handleUndoPool = useCallback((proposalId: ChangeProposalId) => {
    setAcceptedProposalIds((prev) => {
      const next = new Set(prev);
      next.delete(proposalId);
      return next;
    });
    setRejectedProposalIds((prev) => {
      const next = new Set(prev);
      next.delete(proposalId);
      return next;
    });
    setDecisionsTaken((prev) => {
      const { [proposalId]: _, ...rest } = prev;
      return rest as Record<ChangeProposalId, ChangeProposalDecision>;
    });
  }, []);

  const resetPool = useCallback(() => {
    setAcceptedProposalIds(new Set());
    setRejectedProposalIds(new Set());
    setReviewingProposalId(null);
    setDecisionsTaken({});
  }, []);

  const getDecisionForChangeProposal = <T extends ChangeProposalType>(
    changeProposal: ChangeProposal<T>,
  ) => {
    return decisionsTaken[
      changeProposal.id
    ] as unknown as ChangeProposalDecision<T>;
  };

  return {
    reviewingProposalId,
    acceptedProposalIds,
    rejectedProposalIds,
    blockedByConflictIds,
    hasPooledDecisions,
    getDecisionForChangeProposal,
    handleSelectProposal,
    handlePoolAccept,
    handlePoolReject,
    handleUndoPool,
    resetPool,
  };
}
