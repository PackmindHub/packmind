import {
  PMBox,
  PMHStack,
  PMText,
  PMButton,
  PMIcon,
  PMBadge,
} from '@packmind/ui';
import { LuCheck, LuX, LuExternalLink } from 'react-icons/lu';
import type { PendingProposal } from '../types';
import { getProposalActionLabel, formatTimeAgo } from '../types';

interface ProposalRowProps {
  proposal: PendingProposal;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onViewDetails: (id: string) => void;
}

const ARTEFACT_TYPE_COLOR: Record<string, string> = {
  standard: 'blue',
  command: 'purple',
  skill: 'orange',
};

export function ProposalRow({
  proposal,
  onAccept,
  onReject,
  onViewDetails,
}: Readonly<ProposalRowProps>) {
  const actionLabel = getProposalActionLabel(
    proposal.action,
    proposal.artefactType,
  );
  const age = formatTimeAgo(proposal.createdAt);

  return (
    <PMBox
      display="flex"
      flexDirection="column"
      gap={2}
      paddingX={4}
      paddingY={3}
      borderBottomWidth="1px"
      borderColor="border.tertiary"
      _last={{ borderBottomWidth: 0 }}
      _hover={{ bg: 'background.secondary' }}
      transition="background-color 0.15s"
    >
      {/* Top line: action badge + artifact name */}
      <PMHStack gap={2} align="baseline" flexWrap="wrap">
        <PMBadge
          size="sm"
          colorPalette={ARTEFACT_TYPE_COLOR[proposal.artefactType]}
          variant="subtle"
        >
          {actionLabel}
        </PMBadge>
        <PMText
          fontSize="sm"
          fontWeight="medium"
          color="text.primary"
          lineClamp={1}
        >
          {proposal.artefactName}
        </PMText>
      </PMHStack>

      {/* Message */}
      <PMText fontSize="sm" color="text.secondary" lineClamp={2}>
        {proposal.message}
      </PMText>

      {/* Bottom line: meta + actions */}
      <PMHStack justify="space-between" align="center">
        <PMText fontSize="xs" color="text.faded">
          {proposal.authorName} &middot; {age}
        </PMText>

        <PMHStack gap={1}>
          <PMButton
            size="xs"
            variant="ghost"
            color="text.secondary"
            onClick={() => onViewDetails(proposal.id)}
          >
            <PMIcon fontSize="xs">
              <LuExternalLink />
            </PMIcon>
            Details
          </PMButton>
          <PMButton
            size="xs"
            variant="outline"
            colorPalette="red"
            onClick={() => onReject(proposal.id)}
          >
            <PMIcon fontSize="xs">
              <LuX />
            </PMIcon>
            Reject
          </PMButton>
          <PMButton
            size="xs"
            variant="outline"
            colorPalette="green"
            onClick={() => onAccept(proposal.id)}
          >
            <PMIcon fontSize="xs">
              <LuCheck />
            </PMIcon>
            Accept
          </PMButton>
        </PMHStack>
      </PMHStack>
    </PMBox>
  );
}
