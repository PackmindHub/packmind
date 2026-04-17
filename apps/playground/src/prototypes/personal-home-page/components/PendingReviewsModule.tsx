import { PMBox, PMHStack, PMText, PMHeading, PMIcon } from '@packmind/ui';
import { LuGitPullRequestArrow, LuCheck } from 'react-icons/lu';
import type { SpaceWithPendingReviews } from '../types';
import { getOldestProposalAge } from '../types';
import { SpaceReviewBlock } from './SpaceReviewBlock';

interface PendingReviewsModuleProps {
  spaces: SpaceWithPendingReviews[];
  onAcceptProposal: (spaceId: string, proposalId: string) => void;
  onRejectProposal: (spaceId: string, proposalId: string) => void;
  onViewProposalDetails: (spaceId: string, proposalId: string) => void;
}

function sortByOldestProposal(
  spaces: SpaceWithPendingReviews[],
): SpaceWithPendingReviews[] {
  return [...spaces].sort(
    (a, b) =>
      getOldestProposalAge(a).getTime() - getOldestProposalAge(b).getTime(),
  );
}

function ModuleEmptyState() {
  return (
    <PMHStack gap={2} paddingY={2}>
      <PMIcon fontSize="sm" color="green.400">
        <LuCheck />
      </PMIcon>
      <PMText fontSize="sm" color="text.secondary">
        No pending reviews
      </PMText>
    </PMHStack>
  );
}

export function PendingReviewsModule({
  spaces,
  onAcceptProposal,
  onRejectProposal,
  onViewProposalDetails,
}: Readonly<PendingReviewsModuleProps>) {
  const sortedSpaces = sortByOldestProposal(
    spaces.filter((s) => s.pendingProposals.length > 0),
  );
  const totalCount = sortedSpaces.reduce(
    (sum, s) => sum + s.pendingProposals.length,
    0,
  );

  return (
    <PMBox>
      {/* Module header */}
      <PMHStack gap={2} align="center" marginBottom={4}>
        <PMIcon fontSize="md" color="text.secondary">
          <LuGitPullRequestArrow />
        </PMIcon>
        <PMHeading size="md">Pending reviews</PMHeading>
        {totalCount > 0 && (
          <PMText fontSize="sm" color="text.faded">
            {totalCount} across {sortedSpaces.length} space
            {sortedSpaces.length !== 1 ? 's' : ''}
          </PMText>
        )}
      </PMHStack>

      {/* Content */}
      {sortedSpaces.length === 0 ? (
        <ModuleEmptyState />
      ) : (
        <PMBox display="flex" flexDirection="column" gap={3}>
          {sortedSpaces.map((space, index) => (
            <SpaceReviewBlock
              key={space.id}
              space={space}
              onAcceptProposal={onAcceptProposal}
              onRejectProposal={onRejectProposal}
              onViewProposalDetails={onViewProposalDetails}
              defaultExpanded={index === 0}
            />
          ))}
        </PMBox>
      )}
    </PMBox>
  );
}
