import { useState } from 'react';
import {
  PMBox,
  PMHStack,
  PMText,
  PMHeading,
  PMAvatar,
  PMBadge,
  PMIcon,
} from '@packmind/ui';
import { LuChevronDown, LuChevronRight, LuClock } from 'react-icons/lu';
import type { SpaceWithPendingReviews } from '../types';
import { formatTimeAgo, getOldestProposalAge } from '../types';
import { ProposalRow } from './ProposalRow';

interface SpaceReviewBlockProps {
  space: SpaceWithPendingReviews;
  onAcceptProposal: (spaceId: string, proposalId: string) => void;
  onRejectProposal: (spaceId: string, proposalId: string) => void;
  onViewProposalDetails: (spaceId: string, proposalId: string) => void;
  defaultExpanded?: boolean;
}

function getSpaceInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function SpaceReviewBlock({
  space,
  onAcceptProposal,
  onRejectProposal,
  onViewProposalDetails,
  defaultExpanded = false,
}: Readonly<SpaceReviewBlockProps>) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const count = space.pendingProposals.length;
  const oldestAge = formatTimeAgo(getOldestProposalAge(space));

  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="lg"
      overflow="hidden"
      transition="border-color 0.15s"
      _hover={{ borderColor: 'border.secondary' }}
    >
      {/* Header — clickable to expand/collapse */}
      <PMBox
        as="button"
        display="flex"
        alignItems="center"
        gap={3}
        w="full"
        paddingX={4}
        paddingY={3}
        cursor="pointer"
        bg="transparent"
        _hover={{ bg: 'background.secondary' }}
        transition="background-color 0.15s"
        textAlign="left"
        onClick={() => setIsExpanded((v) => !v)}
      >
        {/* Space avatar */}
        <PMAvatar.Root
          size="xs"
          backgroundColor={space.color}
          color="white"
          borderRadius="sm"
          flexShrink={0}
        >
          <PMAvatar.Fallback fontWeight="bold" fontSize="2xs" borderRadius="sm">
            {getSpaceInitials(space.name)}
          </PMAvatar.Fallback>
        </PMAvatar.Root>

        {/* Space name + count */}
        <PMBox flex={1} minW={0}>
          <PMHStack gap={2} align="baseline">
            <PMHeading size="sm" lineClamp={1}>
              {space.name}
            </PMHeading>
            <PMBadge size="sm" variant="subtle" colorPalette="yellow">
              {count} pending
            </PMBadge>
          </PMHStack>
        </PMBox>

        {/* Age indicator */}
        <PMHStack gap={1} flexShrink={0}>
          <PMIcon fontSize="xs" color="text.faded">
            <LuClock />
          </PMIcon>
          <PMText fontSize="xs" color="text.faded">
            oldest: {oldestAge}
          </PMText>
        </PMHStack>

        {/* Chevron */}
        <PMIcon fontSize="sm" color="text.faded">
          {isExpanded ? <LuChevronDown /> : <LuChevronRight />}
        </PMIcon>
      </PMBox>

      {/* Expanded proposal list */}
      {isExpanded && (
        <PMBox borderTopWidth="1px" borderColor="border.tertiary">
          {space.pendingProposals.map((proposal) => (
            <ProposalRow
              key={proposal.id}
              proposal={proposal}
              onAccept={(id) => onAcceptProposal(space.id, id)}
              onReject={(id) => onRejectProposal(space.id, id)}
              onViewDetails={(id) => onViewProposalDetails(space.id, id)}
            />
          ))}
        </PMBox>
      )}
    </PMBox>
  );
}
