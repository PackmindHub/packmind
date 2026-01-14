import { OrganizationId, Recipe, RecipeId, Space } from '@packmind/types';
import { NavLink, Outlet, redirect } from 'react-router';
import { getMeQueryOptions } from '../../src/domain/accounts/api/queries/UserQueries';
import {
  getRecipeByIdOptions,
  getRecipesBySpaceQueryOptions,
} from '../../src/domain/recipes/api/queries/RecipesQueries';
import { getSpaceBySlugQueryOptions } from '../../src/domain/spaces/api/queries/SpacesQueries';
import { queryClient } from '../../src/shared/data/queryClient';
import { routes } from '../../src/shared/utils/routes';
import { MeResponse } from '../../src/domain/accounts/api/gateways/IAuthGateway';

export async function clientLoader({
  params,
}: {
  params: { orgSlug: string; spaceSlug: string; commandId: string };
}) {
  // Get cached data from parent loaders without blocking
  const me = queryClient.getQueryData(getMeQueryOptions().queryKey) as
    | MeResponse
    | undefined;
  if (!me?.organization) {
    throw new Error('Organization not found');
  }

  // Get space from cache - parent loader ensures this is loaded
  const space = queryClient.getQueryData(
    getSpaceBySlugQueryOptions(params.spaceSlug, me.organization.id).queryKey,
  ) as Space | undefined;
  if (!space) {
    throw new Error('Space not found');
  }

  const recipesResponse = (await queryClient.ensureQueryData(
    getRecipesBySpaceQueryOptions(me.organization.id, space.id),
  )) as Recipe[] | { recipes: Recipe[] };
  const recipesList: Recipe[] = Array.isArray(recipesResponse)
    ? recipesResponse
    : (recipesResponse?.recipes ?? []);
  const recipeExists = recipesList.some(
    (candidate) => candidate.id === params.commandId,
  );

  if (!recipeExists) {
    throw redirect(routes.org.toDashboard(me.organization.slug));
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
