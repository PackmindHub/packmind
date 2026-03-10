import { useState } from 'react';
import {
  PMAccordion,
  PMBox,
  PMHeading,
  PMSeparator,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  STUB_PACKAGES,
  STUB_REMOVAL_PROPOSALS,
  STUB_REPOSITORIES,
} from './data';
import {
  PoolStatus,
  RemoveArtefactDecision,
  StubRemovalProposal,
} from './types';
import { RemovalProposalCard } from './components/RemovalProposalCard';
import { RedesignedRemovalCard } from './components/RedesignedRemovalCard';

function useProposalActions(initialProposals: StubRemovalProposal[]): {
  proposals: StubRemovalProposal[];
  handleAccept: (id: string, decision: RemoveArtefactDecision) => void;
  handleDismiss: (id: string) => void;
  handleUndo: (id: string) => void;
} {
  const [proposals, setProposals] =
    useState<StubRemovalProposal[]>(initialProposals);

  const handleAccept = (id: string, decision: RemoveArtefactDecision) => {
    setProposals((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, poolStatus: 'accepted' as PoolStatus, decision }
          : p,
      ),
    );
  };

  const handleDismiss = (id: string) => {
    setProposals((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, poolStatus: 'dismissed' as PoolStatus, decision: null }
          : p,
      ),
    );
  };

  const handleUndo = (id: string) => {
    setProposals((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, poolStatus: 'pending' as PoolStatus, decision: null }
          : p,
      ),
    );
  };

  return { proposals, handleAccept, handleDismiss, handleUndo };
}

function ProposalSection({
  title,
  proposals,
  children,
}: Readonly<{
  title: string;
  proposals: StubRemovalProposal[];
  children: (proposal: StubRemovalProposal) => React.ReactNode;
}>) {
  if (proposals.length === 0) return null;

  return (
    <PMVStack gap={3} align="stretch">
      <PMText fontWeight="semibold" fontSize="sm" color="secondary">
        {title} ({proposals.length})
      </PMText>
      <PMAccordion.Root multiple collapsible>
        <PMVStack gap={3}>{proposals.map(children)}</PMVStack>
      </PMAccordion.Root>
    </PMVStack>
  );
}

export default function ArtifactRemovedPrototype() {
  const current = useProposalActions(STUB_REMOVAL_PROPOSALS);
  const redesigned = useProposalActions(STUB_REMOVAL_PROPOSALS);

  const currentPending = current.proposals.filter(
    (p) => p.poolStatus === 'pending',
  );
  const currentReviewed = current.proposals.filter(
    (p) => p.poolStatus !== 'pending',
  );
  const redesignedPending = redesigned.proposals.filter(
    (p) => p.poolStatus === 'pending',
  );
  const redesignedReviewed = redesigned.proposals.filter(
    (p) => p.poolStatus !== 'pending',
  );

  return (
    <PMBox padding="6" maxWidth="900px" margin="0 auto">
      <PMVStack gap={8} align="stretch">
        {/* ===== CURRENT UI ===== */}
        <PMVStack gap={6} align="stretch">
          <PMVStack gap={1}>
            <PMHeading size="lg">Current UI</PMHeading>
            <PMText fontSize="sm" color="secondary">
              Reproduction of the existing frontend removal change proposal
              cards
            </PMText>
          </PMVStack>

          <ProposalSection title="Pending" proposals={currentPending}>
            {(proposal) => (
              <RemovalProposalCard
                key={proposal.id}
                proposal={proposal}
                packages={STUB_PACKAGES}
                onAccept={(d) => current.handleAccept(proposal.id, d)}
                onDismiss={() => current.handleDismiss(proposal.id)}
                onUndo={() => current.handleUndo(proposal.id)}
              />
            )}
          </ProposalSection>

          <ProposalSection title="Reviewed" proposals={currentReviewed}>
            {(proposal) => (
              <RemovalProposalCard
                key={proposal.id}
                proposal={proposal}
                packages={STUB_PACKAGES}
                onAccept={(d) => current.handleAccept(proposal.id, d)}
                onDismiss={() => current.handleDismiss(proposal.id)}
                onUndo={() => current.handleUndo(proposal.id)}
              />
            )}
          </ProposalSection>
        </PMVStack>

        <PMSeparator borderColor="border.tertiary" />

        {/* ===== REDESIGNED UI ===== */}
        <PMVStack gap={6} align="stretch">
          <PMVStack gap={1}>
            <PMHeading size="lg">Redesigned UI</PMHeading>
            <PMText fontSize="sm" color="secondary">
              Improved lisibility with red accent, trash icon, artifact name in
              body, repository source, and inline package targets
            </PMText>
          </PMVStack>

          <ProposalSection title="Pending" proposals={redesignedPending}>
            {(proposal) => (
              <RedesignedRemovalCard
                key={proposal.id}
                proposal={proposal}
                packages={STUB_PACKAGES}
                repositories={STUB_REPOSITORIES}
                onAccept={(d) => redesigned.handleAccept(proposal.id, d)}
                onDismiss={() => redesigned.handleDismiss(proposal.id)}
                onUndo={() => redesigned.handleUndo(proposal.id)}
              />
            )}
          </ProposalSection>

          <ProposalSection title="Reviewed" proposals={redesignedReviewed}>
            {(proposal) => (
              <RedesignedRemovalCard
                key={proposal.id}
                proposal={proposal}
                packages={STUB_PACKAGES}
                repositories={STUB_REPOSITORIES}
                onAccept={(d) => redesigned.handleAccept(proposal.id, d)}
                onDismiss={() => redesigned.handleDismiss(proposal.id)}
                onUndo={() => redesigned.handleUndo(proposal.id)}
              />
            )}
          </ProposalSection>
        </PMVStack>
      </PMVStack>
    </PMBox>
  );
}
