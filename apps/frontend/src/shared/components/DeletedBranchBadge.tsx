import React from 'react';
import { PMBadge, PMHStack, PMIcon, PMTooltip } from '@packmind/ui';
import { LuTriangleAlert } from 'react-icons/lu';

interface DeletedBranchBadgeProps {
  /** The tracked branch the provider no longer knows about. */
  branch: string;
  testId?: string;
}

/**
 * Marks a tracked branch the Git provider no longer has — the state a merged
 * pull request leaves behind when its branch is deleted. Purely presentational:
 * every surface probes on its own and renders this only on a definite "no" from
 * the provider, never while the probe is loading or failing.
 */
export const DeletedBranchBadge: React.FC<DeletedBranchBadgeProps> = ({
  branch,
  testId = 'deleted-branch-badge',
}) => (
  <PMTooltip
    label={`Branch '${branch}' no longer exists on the Git provider — deleted after a merge, most likely. Distributions are recorded on the tracked branch only, so nothing is recorded any more until tracking points at a branch that exists.`}
  >
    <PMBadge
      size="xs"
      variant="subtle"
      colorPalette="orange"
      data-testid={testId}
    >
      <PMHStack gap={1} align="center">
        <PMIcon fontSize="2xs">
          <LuTriangleAlert />
        </PMIcon>
        Branch deleted
      </PMHStack>
    </PMBadge>
  </PMTooltip>
);
