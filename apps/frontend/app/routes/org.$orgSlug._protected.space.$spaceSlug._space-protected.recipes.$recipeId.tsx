import { Recipe, RecipeId } from '@packmind/types';
import { NavLink, Outlet } from 'react-router';
import { getRecipeByIdOptions } from '../../src/domain/recipes/api/queries/RecipesQueries';
import { queryClient } from '../../src/shared/data/queryClient';
import { routes } from '../../src/shared/utils/routes';
import { getMeQueryOptions } from '../../src/domain/accounts/api/queries/UserQueries';
import { getSpaceBySlugQueryOptions } from '../../src/domain/spaces/api/queries/SpacesQueries';
import { OrganizationId } from '@packmind/types';

export async function clientLoader({
  params,
}: {
  params: { orgSlug: string; spaceSlug: string; recipeId: string };
}) {
  const me = await queryClient.fetchQuery(getMeQueryOptions());
  const space = await queryClient.fetchQuery(
    getSpaceBySlugQueryOptions(params.spaceSlug, me.organization?.id || ''),
  );

  const recipeData = queryClient.ensureQueryData(
    getRecipeByIdOptions(
      me.organization?.id as OrganizationId,
      space.id,
      params.recipeId as RecipeId,
    ),
  );
  return recipeData;
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
