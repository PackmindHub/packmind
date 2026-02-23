import { Outlet } from 'react-router';
import { PMGrid, PMBox, PMText, PMSpinner, PMVStack } from '@packmind/ui';
import { useGetGroupedChangeProposalsQuery } from '../../src/domain/change-proposals/api/queries/ChangeProposalsQueries';
import { ReviewChangesSidebar } from '../../src/domain/change-proposals/components/ReviewChangesSidebar';
import { ReviewChangesBlankState } from '../../src/domain/change-proposals/components/ReviewChangesBlankState';

export default function ReviewChangesLayoutRouteModule() {
  const {
    data: groupedProposals,
    isLoading,
    isError,
  } = useGetGroupedChangeProposalsQuery();

  if (isLoading) {
    return (
      <PMVStack alignItems="center" justifyContent="center" height="full" p={8}>
        <PMSpinner size="lg" />
      </PMVStack>
    );
  }

  if (isError) {
    return (
      <PMBox p={8}>
        <PMText>
          Failed to load change proposals. Please try again later.
        </PMText>
      </PMBox>
    );
  }

  const hasProposals =
    !!groupedProposals?.commands?.length ||
    !!groupedProposals?.standards?.length ||
    !!groupedProposals?.skills?.length;

  if (!hasProposals) {
    return (
      <PMBox p={8}>
        <ReviewChangesBlankState />
      </PMBox>
    );
  }

  return (
    <PMGrid
      height="full"
      gridTemplateColumns={{
        base: 'minmax(240px, 270px) 1fr minmax(280px, 320px)',
      }}
      gridTemplateRows="auto 1fr"
      overflowX="auto"
    >
      <PMBox gridRow="1 / -1" gridColumn="1" overflowY="auto">
        <ReviewChangesSidebar groupedProposals={groupedProposals} />
      </PMBox>
      <Outlet />
    </PMGrid>
  );
}
