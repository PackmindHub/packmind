import { useState } from 'react';
import { PMBox, PMVStack, PMAccordion } from '@packmind/ui';
import { StubProposal, ProposalStatus } from '../../types';
import { ChangesSummaryBar } from './shared/ChangesSummaryBar';
import { ReviewedSectionDivider } from './shared/ReviewedSectionDivider';
import { ProposalAccordionCard } from './ProposalAccordionCard';

export function ProposalAccordionList({
  proposals,
  proposalStatuses,
  onUpdateStatus,
}: {
  proposals: StubProposal[];
  proposalStatuses: Record<string, ProposalStatus>;
  onUpdateStatus: (proposalId: string, status: ProposalStatus) => void;
}) {
  const [expandedIds, setExpandedIds] = useState<string[]>(() =>
    proposals.length > 0 ? [proposals[0].id] : [],
  );

  const withStatus = proposals.map((p) => ({
    ...p,
    status: proposalStatuses[p.id] ?? p.status,
  }));
  const pending = withStatus.filter((p) => p.status === 'pending');
  const reviewed = withStatus.filter((p) => p.status !== 'pending');

  return (
    <PMBox>
      <ChangesSummaryBar
        totalCount={withStatus.length}
        pendingCount={pending.length}
        acceptedCount={withStatus.filter((p) => p.status === 'accepted').length}
        dismissedCount={
          withStatus.filter((p) => p.status === 'rejected').length
        }
      />
      <PMBox px={6} pb={6}>
        <PMAccordion.Root
          collapsible
          multiple
          value={expandedIds}
          onValueChange={(details) => setExpandedIds(details.value)}
        >
          <PMVStack gap={3} width="full">
            {pending.map((p) => (
              <ProposalAccordionCard
                key={p.id}
                proposal={p}
                number={proposals.indexOf(p) + 1}
                onAccept={() => onUpdateStatus(p.id, 'accepted')}
                onDismiss={() => onUpdateStatus(p.id, 'rejected')}
                onUndo={() => onUpdateStatus(p.id, 'pending')}
              />
            ))}
            {reviewed.length > 0 && (
              <>
                <ReviewedSectionDivider count={reviewed.length} />
                {reviewed.map((p) => (
                  <ProposalAccordionCard
                    key={p.id}
                    proposal={p}
                    number={proposals.indexOf(p) + 1}
                    onAccept={() => onUpdateStatus(p.id, 'accepted')}
                    onDismiss={() => onUpdateStatus(p.id, 'rejected')}
                    onUndo={() => onUpdateStatus(p.id, 'pending')}
                  />
                ))}
              </>
            )}
          </PMVStack>
        </PMAccordion.Root>
      </PMBox>
    </PMBox>
  );
}
