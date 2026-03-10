import { useState, useCallback } from 'react';
import {
  PMBox,
  PMHStack,
  PMVStack,
  PMHeading,
  PMText,
  PMButton,
  PMIcon,
  PMBadge,
} from '@packmind/ui';
import { LuChevronDown, LuChevronRight } from 'react-icons/lu';
import { StubGroup, ProposalStatus } from '../../types';
import { ProposalAccordionList } from './ProposalAccordionList';

function proposalCountForGroup(group: StubGroup): number {
  return group.artefacts.reduce((sum, a) => sum + a.proposals.length, 0);
}

export function GroupDetailPanel({
  group,
  proposalStatuses,
  onUpdateStatus,
}: {
  group: StubGroup;
  proposalStatuses: Record<string, ProposalStatus>;
  onUpdateStatus: (proposalId: string, status: ProposalStatus) => void;
}) {
  const [expandedArtefactIds, setExpandedArtefactIds] = useState<Set<string>>(
    () => new Set([group.artefacts[0]?.id]),
  );

  const toggleArtefact = useCallback((id: string) => {
    setExpandedArtefactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const totalProposals = proposalCountForGroup(group);
  const allProposals = group.artefacts.flatMap((a) => a.proposals);
  const acceptedCount = allProposals.filter(
    (p) => proposalStatuses[p.id] === 'accepted',
  ).length;
  const hasPooledDecisions = allProposals.some(
    (p) =>
      proposalStatuses[p.id] === 'accepted' ||
      proposalStatuses[p.id] === 'rejected',
  );

  return (
    <PMBox
      gridColumn="span 2"
      display="flex"
      flexDirection="column"
      height="full"
      overflowY="auto"
    >
      {/* Sticky header */}
      <PMBox
        position="sticky"
        top={0}
        zIndex={10}
        bg="bg.panel"
        borderBottom="1px solid"
        borderColor="border.tertiary"
        px={6}
        py={3}
      >
        <PMHStack justifyContent="space-between" alignItems="center">
          <PMVStack gap={0} alignItems="flex-start">
            <PMHeading size="md">{group.message}</PMHeading>
            <PMText fontSize="sm" color="tertiary">
              {group.author} &middot; {group.createdAt} &middot;{' '}
              {group.artefacts.length} artifact
              {group.artefacts.length !== 1 ? 's' : ''} &middot;{' '}
              {totalProposals} change{totalProposals !== 1 ? 's' : ''}
            </PMText>
          </PMVStack>
          <PMButton variant="primary" size="sm" disabled={!hasPooledDecisions}>
            Apply changes{acceptedCount > 0 ? ` (${acceptedCount})` : ''}
          </PMButton>
        </PMHStack>
      </PMBox>

      {/* Artefact sections */}
      <PMVStack gap={2} align="stretch" p={2}>
        {group.artefacts.map((artefact) => {
          const isExpanded = expandedArtefactIds.has(artefact.id);
          const withStatus = artefact.proposals.map((p) => ({
            ...p,
            status: proposalStatuses[p.id] ?? p.status,
          }));
          const pendingCount = withStatus.filter(
            (p) => p.status === 'pending',
          ).length;

          return (
            <PMBox key={artefact.id}>
              {/* Artefact header row */}
              <PMBox
                width="full"
                bg="bg.panel"
                borderRadius="md"
                px={6}
                py={2}
                borderBottom="1px solid"
                borderColor="border.tertiary"
                cursor="pointer"
                onClick={() => toggleArtefact(artefact.id)}
                _hover={{ bg: '{colors.background.secondary}' }}
                transition="background 0.1s"
              >
                <PMHStack
                  gap={3}
                  alignItems="center"
                  justifyContent="flex-start"
                >
                  <PMIcon color="text.faded" fontSize="xs">
                    {isExpanded ? <LuChevronDown /> : <LuChevronRight />}
                  </PMIcon>
                  <PMText fontSize="sm" fontWeight="semibold" color="faded">
                    {artefact.name}
                  </PMText>
                  <PMText fontSize="xs" color="faded">
                    {artefact.proposals.length} change
                    {artefact.proposals.length !== 1 ? 's' : ''}
                  </PMText>
                  {pendingCount > 0 && (
                    <PMBadge colorPalette="yellow" variant="subtle" size="sm">
                      {pendingCount} pending
                    </PMBadge>
                  )}
                </PMHStack>
              </PMBox>

              {/* Expanded: proposal accordion */}
              {isExpanded && (
                <ProposalAccordionList
                  proposals={artefact.proposals}
                  proposalStatuses={proposalStatuses}
                  onUpdateStatus={onUpdateStatus}
                />
              )}
            </PMBox>
          );
        })}
      </PMVStack>
    </PMBox>
  );
}
