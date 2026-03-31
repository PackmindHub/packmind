import { useEffect, useState } from 'react';
import { SubmittedState } from '../types';

export function useCreationProposalCache<T>(proposal: T | undefined): {
  displayedProposal: T | undefined;
  submittedState: SubmittedState | null;
  setSubmittedState: (state: SubmittedState) => void;
} {
  const [cachedProposal, setCachedProposal] = useState<T | undefined>(proposal);
  const [submittedState, setSubmittedState] = useState<SubmittedState | null>(
    null,
  );

  useEffect(() => {
    if (proposal) setCachedProposal(proposal);
  }, [proposal]);

  return {
    displayedProposal: cachedProposal ?? proposal,
    submittedState,
    setSubmittedState,
  };
}
