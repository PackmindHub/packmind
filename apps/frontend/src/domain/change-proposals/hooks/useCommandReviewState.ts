import { useCallback, useState } from 'react';
import { ChangeProposalId } from '@packmind/types';

export type ViewMode = 'diff' | 'focused' | 'inline';
export type ReviewTab = 'changes' | 'original' | 'result';

export function useCommandReviewState() {
  const [activeTab, setActiveTab] = useState<ReviewTab>('changes');
  const [expandedCardIds, setExpandedCardIds] = useState<string[]>([]);
  const [viewModeByProposal, setViewModeByProposal] = useState<
    Map<ChangeProposalId, ViewMode>
  >(new Map());
  const [editingProposalId, setEditingProposalId] =
    useState<ChangeProposalId | null>(null);
  const [editedValues, setEditedValues] = useState<
    Map<ChangeProposalId, string>
  >(new Map());

  const toggleCard = useCallback((ids: string[]) => {
    setExpandedCardIds(ids);
  }, []);

  const getViewMode = useCallback(
    (proposalId: ChangeProposalId): ViewMode =>
      viewModeByProposal.get(proposalId) ?? 'focused',
    [viewModeByProposal],
  );

  const setViewMode = useCallback(
    (proposalId: ChangeProposalId, mode: ViewMode) => {
      setViewModeByProposal((prev) => {
        const next = new Map(prev);
        next.set(proposalId, mode);
        return next;
      });
    },
    [],
  );

  const startEditing = useCallback(
    (proposalId: ChangeProposalId, initialValue: string) => {
      setEditingProposalId(proposalId);
      if (!editedValues.has(proposalId)) {
        setEditedValues((prev) => {
          const next = new Map(prev);
          next.set(proposalId, initialValue);
          return next;
        });
      }
    },
    [editedValues],
  );

  const cancelEditing = useCallback(() => {
    setEditingProposalId(null);
  }, []);

  const setEditedValue = useCallback(
    (proposalId: ChangeProposalId, value: string) => {
      setEditedValues((prev) => {
        const next = new Map(prev);
        next.set(proposalId, value);
        return next;
      });
    },
    [],
  );

  const resetEditedValue = useCallback((proposalId: ChangeProposalId) => {
    setEditedValues((prev) => {
      const next = new Map(prev);
      next.delete(proposalId);
      return next;
    });
  }, []);

  return {
    activeTab,
    setActiveTab,
    expandedCardIds,
    toggleCard,
    editingProposalId,
    editedValues,
    getViewMode,
    setViewMode,
    startEditing,
    cancelEditing,
    setEditedValue,
    resetEditedValue,
  };
}
