import { useState } from 'react';
import { PMBox, PMVStack, PMAccordion } from '@packmind/ui';
import { StubProposal, ProposalStatus } from '../../types';
import { ChangesSummaryBar } from './shared/ChangesSummaryBar';
import { ReviewedSectionDivider } from './shared/ReviewedSectionDivider';
import { FileGroupHeader } from './FileGroupHeader';
import { ProposalAccordionCard } from './ProposalAccordionCard';

interface FileGroup {
  filePath: string;
  proposals: StubProposal[];
}

function groupProposalsByFile(proposals: StubProposal[]): FileGroup[] {
  const groups = new Map<string, StubProposal[]>();
  for (const p of proposals) {
    const path = p.filePath ?? 'SKILL.md';
    const existing = groups.get(path);
    if (existing) {
      existing.push(p);
    } else {
      groups.set(path, [p]);
    }
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      if (a === 'SKILL.md') return -1;
      if (b === 'SKILL.md') return 1;
      return a.localeCompare(b);
    })
    .map(([filePath, fileProposals]) => ({
      filePath,
      proposals: fileProposals,
    }));
}

export function SkillGroupedAccordionList({
  proposals,
  proposalStatuses,
  onUpdateStatus,
  fileFilter,
}: {
  proposals: StubProposal[];
  proposalStatuses: Record<string, ProposalStatus>;
  onUpdateStatus: (proposalId: string, status: ProposalStatus) => void;
  fileFilter: string | null;
}) {
  const [expandedIds, setExpandedIds] = useState<string[]>(() =>
    proposals.length > 0 ? [proposals[0].id] : [],
  );

  const filteredProposals = fileFilter
    ? proposals.filter((p) => (p.filePath ?? 'SKILL.md') === fileFilter)
    : proposals;

  const withStatus = filteredProposals.map((p) => ({
    ...p,
    status: proposalStatuses[p.id] ?? p.status,
  }));

  const pending = withStatus.filter((p) => p.status === 'pending');
  const reviewed = withStatus.filter((p) => p.status !== 'pending');

  const pendingFileGroups = groupProposalsByFile(pending);
  const reviewedFileGroups = groupProposalsByFile(reviewed);

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
            {pendingFileGroups.map((group) => (
              <PMBox key={group.filePath} width="full">
                <FileGroupHeader
                  filePath={group.filePath}
                  changeCount={group.proposals.length}
                  pendingCount={group.proposals.length}
                />
                <PMVStack gap={3} mt={3} px={2}>
                  {group.proposals.map((p) => (
                    <ProposalAccordionCard
                      key={p.id}
                      proposal={p}
                      number={filteredProposals.indexOf(p) + 1}
                      onAccept={() => onUpdateStatus(p.id, 'accepted')}
                      onDismiss={() => onUpdateStatus(p.id, 'rejected')}
                      onUndo={() => onUpdateStatus(p.id, 'pending')}
                    />
                  ))}
                </PMVStack>
              </PMBox>
            ))}
            {reviewedFileGroups.length > 0 && (
              <>
                <ReviewedSectionDivider count={reviewed.length} />
                {reviewedFileGroups.map((group) => (
                  <PMBox key={group.filePath} width="full">
                    <FileGroupHeader
                      filePath={group.filePath}
                      changeCount={group.proposals.length}
                      pendingCount={0}
                    />
                    <PMVStack gap={3} mt={3} px={2}>
                      {group.proposals.map((p) => (
                        <ProposalAccordionCard
                          key={p.id}
                          proposal={p}
                          number={filteredProposals.indexOf(p) + 1}
                          onAccept={() => onUpdateStatus(p.id, 'accepted')}
                          onDismiss={() => onUpdateStatus(p.id, 'rejected')}
                          onUndo={() => onUpdateStatus(p.id, 'pending')}
                        />
                      ))}
                    </PMVStack>
                  </PMBox>
                ))}
              </>
            )}
          </PMVStack>
        </PMAccordion.Root>
      </PMBox>
    </PMBox>
  );
}
