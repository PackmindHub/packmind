import { ReactNode } from 'react';
import {
  PMBadge,
  PMBox,
  PMHStack,
  PMIcon,
  PMText,
  PMTooltip,
  PMVStack,
} from '@packmind/ui';
import { UserId } from '@packmind/types';
import { LuCircleAlert } from 'react-icons/lu';
import { ChangeProposalWithConflicts } from '../../types';
import { getChangeProposalFieldLabel } from '../../utils/changeProposalHelpers';
import { formatRelativeTime } from '../../utils/formatRelativeTime';
import { UserAvatarWithInitials } from '../../../accounts/components/UserAvatarWithInitials';

interface ProposalCardBaseProps {
  proposal: ChangeProposalWithConflicts;
  isSelected: boolean;
  borderColor?: string;
  proposalNumber?: number;
  userLookup: Map<UserId, string>;
  currentArtefactVersion?: number;
  onSelect: () => void;
  actions: ReactNode;
}

export function ProposalCardBase({
  proposal,
  isSelected,
  borderColor = 'border.tertiary',
  proposalNumber,
  userLookup,
  currentArtefactVersion,
  onSelect,
  actions,
}: ProposalCardBaseProps) {
  const authorEmail = userLookup.get(proposal.createdBy) ?? 'Unknown user';
  const isOutdated =
    currentArtefactVersion !== undefined &&
    proposal.artefactVersion !== currentArtefactVersion;

  return (
    <PMBox
      borderRadius="md"
      border="1px solid"
      borderColor={borderColor}
      cursor="pointer"
      width="full"
      p={2}
      backgroundColor={isSelected ? 'background.tertiary' : undefined}
      _hover={isSelected ? undefined : { background: 'background.tertiary' }}
      onClick={onSelect}
    >
      <PMVStack gap={2} align="stretch">
        <PMHStack gap={2} justify="space-between" align="center">
          <PMHStack gap={1} align="center">
            <PMText fontSize="xs" color="secondary">
              {proposalNumber !== undefined && `#${proposalNumber} - `}
              {formatRelativeTime(proposal.createdAt)}
            </PMText>
            <PMText fontSize="xs" color="secondary">
              -
            </PMText>
            <UserAvatarWithInitials displayName={authorEmail} size="xs" />
          </PMHStack>
          {actions}
        </PMHStack>
        <PMText fontSize="sm" fontWeight="bold">
          {getChangeProposalFieldLabel(proposal.type)}
        </PMText>
        <PMHStack gap={2} align="center">
          <PMText fontSize="xs" color="secondary">
            <PMText as="span" fontWeight="bold">
              Base version
            </PMText>{' '}
            {proposal.artefactVersion}
          </PMText>
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
        </PMHStack>
      </PMVStack>
    </PMBox>
  );
}
