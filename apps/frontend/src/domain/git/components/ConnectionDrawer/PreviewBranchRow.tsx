import React from 'react';
import { PMBox, PMHStack, PMIcon, PMText } from '@packmind/ui';
import { LuGitBranch } from 'react-icons/lu';
import { GitRepoId } from '@packmind/types';
import { useCheckTrackedBranchExistsQuery } from '../../api/queries';
import { DeletedBranchBadge } from '../../../../shared/components/DeletedBranchBadge';

interface PreviewBranchRowProps {
  branch: string;
  gitRepoId: GitRepoId;
}

/**
 * One tracked branch in the drawer's repository list — the screen the drawer
 * opens on, so a branch the provider no longer has is marked here rather than
 * only behind the Manage panel.
 */
export const PreviewBranchRow: React.FC<PreviewBranchRowProps> = ({
  branch,
  gitRepoId,
}) => {
  const trackedBranch = useCheckTrackedBranchExistsQuery(gitRepoId);

  return (
    <PMBox paddingX={3} paddingY={1.5} paddingLeft={6}>
      <PMHStack gap={2} align="center" minW={0}>
        <PMIcon fontSize="2xs" color="text.faded">
          <LuGitBranch />
        </PMIcon>
        <PMText fontSize="sm" color="secondary" truncate>
          {branch}
        </PMText>
        {/* Only a definite "no" from the provider — never a pending or failed probe. */}
        {trackedBranch.data === false && <DeletedBranchBadge branch={branch} />}
      </PMHStack>
    </PMBox>
  );
};
