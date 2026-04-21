import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  ChangeProposal,
  ChangeProposalDecision,
  ChangeProposalId,
  ChangeProposalType,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../types';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { changeProposalsGateway } from '../api/gateways';
import { RECOMPUTE_CONFLICTS_KEY } from '../api/queryKeys';

export function useChangeProposalPool(
  proposals: ChangeProposalWithConflicts[],
) {
  const { organization } = useAuthContext();

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

  const hasDecisions = Object.keys(decisionsTaken).length > 0;
  const artefactId = proposals[0]?.artefactId;
  const spaceId = proposals[0]?.spaceId;

  const conflictsQuery = useQuery({
    queryKey: [...RECOMPUTE_CONFLICTS_KEY, artefactId, decisionsTaken],
    queryFn: () =>
      changeProposalsGateway.recomputeConflicts({
        organizationId: organization!.id,
        spaceId: spaceId!,
        artefactId: artefactId!,
        decisions: decisionsTaken,
      }),
    enabled: hasDecisions && !!organization?.id && !!artefactId && !!spaceId,
    placeholderData: keepPreviousData,
  });

  const blockedByConflictIds = useMemo(() => {
    const recomputedConflicts = hasDecisions
      ? conflictsQuery.data?.conflicts
      : undefined;

    const blocked = new Set<ChangeProposalId>();

    for (const proposal of proposals) {
      if (acceptedProposalIds.has(proposal.id)) continue;

      const conflictsWith =
        recomputedConflicts?.[proposal.id] ?? proposal.conflictsWith;

      for (const conflictId of conflictsWith) {
        if (acceptedProposalIds.has(conflictId)) {
          blocked.add(proposal.id);
          break;
        }
      }
    }

    return blocked;
  }, [hasDecisions, conflictsQuery.data, proposals, acceptedProposalIds]);

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

  const proposalsWithDecisions = useMemo(
    () =>
      proposals.map((p) => {
        const decision = decisionsTaken[p.id];
        return decision
          ? ({ ...p, decision } as ChangeProposalWithConflicts)
          : p;
      }),
    [proposals, decisionsTaken],
  );

  return {
    reviewingProposalId,
    acceptedProposalIds,
    rejectedProposalIds,
    blockedByConflictIds,
    hasPooledDecisions,
    proposalsWithDecisions,
    getDecisionForChangeProposal,
    handleSelectProposal,
    handlePoolAccept,
    handlePoolReject,
    handleUndoPool,
    resetPool,
  };
}
