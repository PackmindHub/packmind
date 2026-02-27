import { PMAccordion, PMHStack } from '@packmind/ui';
import { ChangeProposalType } from '@packmind/types';
import { ProposalLabel } from './ProposalLabel';
import { StatusDot } from './StatusDot';
import { ProposalMeta } from './ProposalMeta';

type PoolStatus = 'pending' | 'accepted' | 'dismissed';

interface ChangeProposalCardHeaderProps {
  proposalNumber: number;
  proposalType: ChangeProposalType;
  poolStatus: PoolStatus;
  authorName: string;
  createdAt: Date;
  artefactVersion: number;
}

export function ChangeProposalCardHeader({
  proposalNumber,
  proposalType,
  poolStatus,
  authorName,
  createdAt,
  artefactVersion,
}: Readonly<ChangeProposalCardHeaderProps>) {
  return (
    <PMAccordion.ItemTrigger px={4} py={3}>
      <PMHStack flex={1} gap={3} alignItems="center">
        <PMAccordion.ItemIndicator />
        <ProposalLabel
          proposalNumber={proposalNumber}
          proposalType={proposalType}
        />
        <StatusDot status={poolStatus} />
        <PMHStack flex={1} justifyContent="flex-end">
          <ProposalMeta
            authorName={authorName}
            createdAt={createdAt}
            artefactVersion={artefactVersion}
          />
        </PMHStack>
      </PMHStack>
    </PMAccordion.ItemTrigger>
  );
}
