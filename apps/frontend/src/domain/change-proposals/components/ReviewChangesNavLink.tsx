import React from 'react';
import { useGetGroupedChangeProposalsQuery } from '../api/queries/ChangeProposalsQueries';
import { SidebarNavigationLink } from '../../organizations/components/SidebarNavigation';
import { useGetSpaceBySlugQuery } from '../../spaces/api/queries/SpacesQueries';
import { routes } from '../../../shared/utils/routes';

interface ReviewChangesNavLinkProps {
  orgSlug: string;
  spaceSlug: string;
}

export function ReviewChangesNavLink({
  orgSlug,
  spaceSlug,
}: ReviewChangesNavLinkProps): React.ReactElement {
  const { data: space } = useGetSpaceBySlugQuery(spaceSlug);
  const { data: groupedProposals } = useGetGroupedChangeProposalsQuery(
    space?.id,
  );

  const totalArtefacts = groupedProposals
    ? groupedProposals.standards.length +
      groupedProposals.commands.length +
      groupedProposals.skills.length
    : 0;

  return (
    <SidebarNavigationLink
      url={routes.space.toReviewChanges(orgSlug, spaceSlug)}
      label="Review changes"
      badge={
        totalArtefacts > 0
          ? { text: String(totalArtefacts), colorScheme: 'blue' }
          : undefined
      }
    />
  );
}
