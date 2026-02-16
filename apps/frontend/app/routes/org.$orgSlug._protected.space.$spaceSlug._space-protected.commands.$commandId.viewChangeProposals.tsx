import { useParams, NavLink } from 'react-router';
import { PMPage, PMBox, PMVStack, PMSpinner, PMText } from '@packmind/ui';
import {
  ChangeProposalStatus,
  ChangeProposalWithOutdatedStatus,
  RecipeId,
} from '@packmind/types';
import { ChangeProposalsTable } from '../../src/domain/recipes/components/ChangeProposalsTable';
import { useGetChangeProposalsQuery } from '../../src/domain/recipes/api/queries/ChangeProposalsQueries';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { routes } from '../../src/shared/utils/routes';

export const handle = {
  crumb: ({
    params,
  }: {
    params: { orgSlug: string; spaceSlug: string; commandId: string };
  }) => {
    return (
      <NavLink
        to={routes.space.toCommandChangeProposals(
          params.orgSlug,
          params.spaceSlug,
          params.commandId,
        )}
      >
        Changes to review
      </NavLink>
    );
  },
};

export default function ViewChangeProposalsRouteModule() {
  const { commandId } = useParams<{
    orgSlug: string;
    spaceSlug: string;
    commandId: string;
  }>();

  const {
    data: proposals,
    isLoading,
    isError,
  } = useGetChangeProposalsQuery(commandId as RecipeId);

  // TODO: filter pending proposals on the backend side to avoid fetching unnecessary data
  function getPendingProposals(proposals: ChangeProposalWithOutdatedStatus[]) {
    return proposals.filter((p) => p.status === ChangeProposalStatus.pending);
  }

  if (isLoading) {
    return (
      <PMPage
        title="Loading Change Proposals..."
        subtitle="Please wait while we fetch the change proposals"
      >
        <PMBox
          display="flex"
          alignItems="center"
          justifyContent="center"
          minH="200px"
        >
          <PMSpinner size="lg" mr={2} />
          <PMText ml={2}>Loading change proposals...</PMText>
        </PMBox>
      </PMPage>
    );
  }

  if (isError || !proposals) {
    return (
      <PMPage title="Error" subtitle="Failed to load change proposals">
        <PMBox display="flex" justifyContent="center" py={8}>
          <PMVStack gap={4}>
            <PMText>Failed to load change proposals. Please try again.</PMText>
          </PMVStack>
        </PMBox>
      </PMPage>
    );
  }

  return (
    <PMPage
      title="Change proposals"
      subtitle="Review and manage proposed changes to this command"
    >
      <ChangeProposalsTable
        proposals={getPendingProposals(proposals)}
        recipeId={commandId as RecipeId}
      />
    </PMPage>
  );
}
