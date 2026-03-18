import {
  PMAccordion,
  PMBadge,
  PMHStack,
  PMIcon,
  PMText,
  PMTooltip,
} from '@packmind/ui';
import {
  ChangeProposalType,
  getItemTypeFromChangeProposalType,
} from '@packmind/types';
import { LuCircleAlert, LuPencil, LuTrash2 } from 'react-icons/lu';
import { ProposalLabel } from './ProposalLabel';
import { StatusDot } from './StatusDot';
import { ProposalMeta } from './ProposalMeta';
import { RelativeTime } from './RelativeTime';

function isRemoveProposal(type: ChangeProposalType): boolean {
  return (
    type === ChangeProposalType.removeStandard ||
    type === ChangeProposalType.removeCommand ||
    type === ChangeProposalType.removeSkill
  );
}

type PoolStatus = 'pending' | 'accepted' | 'dismissed';

interface ChangeProposalCardHeaderProps {
  proposalNumber: number;
  proposalType: ChangeProposalType;
  poolStatus: PoolStatus;
  isOutdated: boolean;
  isEdited: boolean;
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
  isEdited,
  authorName,
  createdAt,
  artefactVersion,
  filePath,
}: Readonly<ChangeProposalCardHeaderProps>) {
  const isRemoval = isRemoveProposal(proposalType);
  const artefactTypeLabel = isRemoval
    ? (() => {
        const itemType = getItemTypeFromChangeProposalType(proposalType);
        return itemType.charAt(0).toUpperCase() + itemType.slice(1);
      })()
    : undefined;

  return (
    <PMAccordion.ItemTrigger
      px={4}
      py={3}
      _hover={{ cursor: 'pointer' }}
      {...(isRemoval && { bg: 'red.950/30' })}
    >
      <PMHStack flex={1} gap={3} alignItems="center">
        <PMAccordion.ItemIndicator />
        {isRemoval && (
          <PMIcon color="red.400" fontSize="md">
            <LuTrash2 />
          </PMIcon>
        )}
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
        {isEdited && (
          <PMTooltip label="This proposal was edited before acceptance">
            <PMBadge colorPalette="blue" variant="subtle" size="sm">
              <PMIcon>
                <LuPencil />
              </PMIcon>
              Edited
            </PMBadge>
          </PMTooltip>
        )}
        {filePath && (
          <PMBadge variant="outline" size="sm" fontFamily="mono">
            {filePath}
          </PMBadge>
        )}
        <PMHStack flex={1} justifyContent="flex-end">
          {isRemoval ? (
            <PMHStack gap={2} alignItems="center">
              <PMText fontSize="xs" color="secondary">
                {authorName} &middot; <RelativeTime date={createdAt} /> &middot;
              </PMText>
              <PMBadge size="sm" colorPalette="red" variant="subtle">
                {artefactTypeLabel}
              </PMBadge>
            </PMHStack>
          ) : (
            <ProposalMeta
              authorName={authorName}
              createdAt={createdAt}
              artefactVersion={artefactVersion}
            />
          )}
        </PMHStack>
      </PMHStack>
    </PMAccordion.ItemTrigger>
  );
}
