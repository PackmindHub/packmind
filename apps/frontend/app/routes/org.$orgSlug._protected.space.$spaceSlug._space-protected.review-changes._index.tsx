import { Navigate, useParams } from 'react-router';
import { PMBox, PMText } from '@packmind/ui';
import { useGetGroupedChangeProposalsQuery } from '../../src/domain/change-proposals/api/queries/ChangeProposalsQueries';
import { routes } from '../../src/shared/utils/routes';

export default function ReviewChangesIndexRouteModule() {
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();

  const { data: groupedProposals } = useGetGroupedChangeProposalsQuery();

  if (orgSlug && spaceSlug && groupedProposals) {
    const allItems = [
      ...groupedProposals.commands.map((item) => ({
        ...item,
        artefactType: 'commands' as const,
      })),
      ...groupedProposals.standards.map((item) => ({
        ...item,
        artefactType: 'standards' as const,
      })),
      ...groupedProposals.skills.map((item) => ({
        ...item,
        artefactType: 'skills' as const,
      })),
    ].sort((a, b) => b.lastContributedAt.localeCompare(a.lastContributedAt));

    const sortedCreations = [...(groupedProposals.creations ?? [])].sort(
      (a, b) => b.lastContributedAt.localeCompare(a.lastContributedAt),
    );

    if (allItems.length > 0) {
      const first = allItems[0];
      return (
        <Navigate
          to={routes.space.toReviewChangesArtefact(
            orgSlug,
            spaceSlug,
            first.artefactType,
            first.artefactId,
          )}
          replace
        />
      );
    }

    if (sortedCreations.length > 0) {
      const first = sortedCreations[0];
      return (
        <Navigate
          to={routes.space.toReviewChangesCreation(
            orgSlug,
            spaceSlug,
            first.artefactType,
            first.id,
          )}
          replace
        />
      );
    }
  }

  return (
    <PMBox
      display="flex"
      alignItems="center"
      justifyContent="center"
      minH="300px"
      gridColumn="span 2"
    >
      <PMText fontSize="md">
        Select an artefact to review in the left panel
      </PMText>
    </PMBox>
  );
}
