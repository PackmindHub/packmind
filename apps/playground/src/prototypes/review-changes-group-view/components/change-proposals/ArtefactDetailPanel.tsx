import {
  PMBox,
  PMHStack,
  PMVStack,
  PMHeading,
  PMText,
  PMButton,
} from '@packmind/ui';
import {
  StubGroupArtefact,
  ProposalStatus,
  ARTEFACT_TYPE_LABEL,
} from '../../types';
import { ProposalAccordionList } from './ProposalAccordionList';
import { SkillGroupedAccordionList } from './SkillGroupedAccordionList';

export function ArtefactDetailPanel({
  artefact,
  proposalStatuses,
  onUpdateStatus,
  fileFilter,
}: {
  artefact: StubGroupArtefact;
  proposalStatuses: Record<string, ProposalStatus>;
  onUpdateStatus: (proposalId: string, status: ProposalStatus) => void;
  fileFilter: string | null;
}) {
  const withStatus = artefact.proposals.map((p) => ({
    ...p,
    status: proposalStatuses[p.id] ?? p.status,
  }));
  const acceptedCount = withStatus.filter(
    (p) => p.status === 'accepted',
  ).length;
  const hasPooledDecisions = withStatus.some(
    (p) => p.status === 'accepted' || p.status === 'rejected',
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
          <PMHStack gap={2}>
            <PMVStack gap={0} alignItems="flex-start">
              <PMHeading size="md">{artefact.name}</PMHeading>
              <PMText fontSize="xs" color="tertiary">
                {ARTEFACT_TYPE_LABEL[artefact.artefactType]} &middot;{' '}
                {withStatus.length} change
                {withStatus.length !== 1 ? 's' : ''}
              </PMText>
            </PMVStack>
          </PMHStack>
          <PMButton variant="primary" size="sm" disabled={!hasPooledDecisions}>
            Apply changes{acceptedCount > 0 ? ` (${acceptedCount})` : ''}
          </PMButton>
        </PMHStack>
      </PMBox>

      {/* Proposal accordion — grouped by file for skills, flat for others */}
      {artefact.artefactType === 'skill' ? (
        <SkillGroupedAccordionList
          proposals={artefact.proposals}
          proposalStatuses={proposalStatuses}
          onUpdateStatus={onUpdateStatus}
          fileFilter={fileFilter}
        />
      ) : (
        <ProposalAccordionList
          proposals={artefact.proposals}
          proposalStatuses={proposalStatuses}
          onUpdateStatus={onUpdateStatus}
        />
      )}
    </PMBox>
  );
}
