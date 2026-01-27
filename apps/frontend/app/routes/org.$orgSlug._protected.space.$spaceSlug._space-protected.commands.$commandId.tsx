import { OrganizationId, Recipe, RecipeId } from '@packmind/types';
import { NavLink, Outlet } from 'react-router';
import { getMeQueryOptions } from '../../src/domain/accounts/api/queries/UserQueries';
import { getRecipeByIdOptions } from '../../src/domain/recipes/api/queries/RecipesQueries';
import { getSpaceBySlugQueryOptions } from '../../src/domain/spaces/api/queries/SpacesQueries';
import { queryClient } from '../../src/shared/data/queryClient';
import { routes } from '../../src/shared/utils/routes';

export async function clientLoader({
  params,
}: {
  params: { orgSlug: string; spaceSlug: string; commandId: string };
}) {
  // Fetch user data - ensureQueryData uses cache if available, fetches otherwise
  const me = await queryClient.ensureQueryData(getMeQueryOptions());
  if (!me.organization) {
    throw new Error('Organization not found');
  }

  // Fetch space data - ensureQueryData uses cache if available, fetches otherwise
  const space = await queryClient.ensureQueryData(
    getSpaceBySlugQueryOptions(params.spaceSlug, me.organization.id),
  );
  if (!space) {
    throw new Error('Space not found');
  }

  return queryClient.ensureQueryData(
    getRecipeByIdOptions(
      me.organization.id as OrganizationId,
      space.id,
      params.commandId as RecipeId,
    ),
  );
}

export const handle = {
  crumb: ({
    params,
    data,
  }: {
    params: { orgSlug: string; spaceSlug: string; commandId: string };
    data: Recipe;
  }) => {
    const commandId = params.commandId;
    return (
      <NavLink
        to={routes.space.toCommand(params.orgSlug, params.spaceSlug, commandId)}
      >
        {data.name}
      </NavLink>
    );
  },
};
export default function CommandDetailsRouteModule() {
  return <Outlet />;
}
