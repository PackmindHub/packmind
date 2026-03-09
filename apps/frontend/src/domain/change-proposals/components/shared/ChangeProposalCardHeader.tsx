import {
  PMAccordion,
  PMBadge,
  PMHStack,
  PMIcon,
  PMTooltip,
} from '@packmind/ui';
import { ChangeProposalType } from '@packmind/types';
import { LuCircleAlert } from 'react-icons/lu';
import { ProposalLabel } from './ProposalLabel';
import { StatusDot } from './StatusDot';
import { ProposalMeta } from './ProposalMeta';

type PoolStatus = 'pending' | 'accepted' | 'dismissed';

interface ChangeProposalCardHeaderProps {
  proposalNumber: number;
  proposalType: ChangeProposalType;
  poolStatus: PoolStatus;
  isOutdated: boolean;
  authorName: string;
  createdAt: Date;
  artefactVersion: number;
  filePath?: string;
}

export function ChangeProposalCardHeader({
  proposalNumber,
  proposalType,
  poolStatus,
  isOutdated,
  authorName,
  createdAt,
  artefactVersion,
  filePath,
}: Readonly<ChangeProposalCardHeaderProps>) {
  return (
    <PMAccordion.ItemTrigger px={4} py={3} _hover={{ cursor: 'pointer' }}>
      <PMHStack flex={1} gap={3} alignItems="center">
        <PMAccordion.ItemIndicator />
        <ProposalLabel
          proposalNumber={proposalNumber}
          proposalType={proposalType}
        />
        <StatusDot status={poolStatus} />
        {isOutdated && (
          <PMTooltip label="This proposal was made on an outdated version">
            <PMBadge colorPalette="orange" variant="subtle" size="sm">
              <PMIcon>
                <LuCircleAlert />
              </PMIcon>
              Outdated
            </PMBadge>
          </PMTooltip>
        )}
        {filePath && (
          <PMBadge variant="outline" size="sm" fontFamily="mono">
            {filePath}
          </PMBadge>
        )}
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
