import { OrganizationId, Recipe, RecipeId } from '@packmind/types';
import { NavLink, Outlet, redirect } from 'react-router';
import { getMeQueryOptions } from '../../src/domain/accounts/api/queries/UserQueries';
import {
  getRecipeByIdOptions,
  getRecipesBySpaceQueryOptions,
} from '../../src/domain/recipes/api/queries/RecipesQueries';
import { getSpaceBySlugQueryOptions } from '../../src/domain/spaces/api/queries/SpacesQueries';
import { queryClient } from '../../src/shared/data/queryClient';
import { routes } from '../../src/shared/utils/routes';

export async function clientLoader({
  params,
}: {
  params: { orgSlug: string; spaceSlug: string; recipeId: string };
}) {
  const me = await queryClient.fetchQuery(getMeQueryOptions());
  if (!me.organization) {
    throw new Error('Organization not found');
  }

  const space = await queryClient.fetchQuery(
    getSpaceBySlugQueryOptions(params.spaceSlug, me.organization.id),
  );
  if (!space) {
    throw new Error('Space not found');
  }

  const recipesResponse = (await queryClient.fetchQuery(
    getRecipesBySpaceQueryOptions(me.organization.id, space.id),
  )) as Recipe[] | { recipes: Recipe[] };
  const recipesList: Recipe[] = Array.isArray(recipesResponse)
    ? recipesResponse
    : (recipesResponse?.recipes ?? []);
  const recipeExists = recipesList.some(
    (candidate) => candidate.id === params.recipeId,
  );

  if (!recipeExists) {
    throw redirect(routes.org.toDashboard(me.organization.slug));
  }

  return queryClient.fetchQuery(
    getRecipeByIdOptions(
      me.organization.id as OrganizationId,
      space.id,
      params.recipeId as RecipeId,
    ),
  );
}

export const handle = {
  crumb: ({
    params,
    data,
  }: {
    params: { orgSlug: string; spaceSlug: string; recipeId: string };
    data: Recipe;
  }) => {
    const recipeId = params.recipeId;
    return (
      <NavLink
        to={routes.space.toRecipe(params.orgSlug, params.spaceSlug, recipeId)}
      >
        {data.name}
      </NavLink>
    );
  },
};
export default function RecipeDetailsRouteModule() {
  return <Outlet />;
}
