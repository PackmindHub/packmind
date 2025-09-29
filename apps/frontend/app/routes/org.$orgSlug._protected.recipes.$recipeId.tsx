import { Recipe, RecipeId } from '@packmind/shared';
import { NavLink, Outlet } from 'react-router';
import { getRecipeByIdOptions } from '../../src/domain/recipes/api/queries/RecipesQueries';
import { queryClient } from '../../src/shared/data/queryClient';

export function clientLoader({ params }: { params: { recipeId: string } }) {
  const recipeData = queryClient.ensureQueryData(
    getRecipeByIdOptions(params.recipeId as RecipeId),
  );
  return recipeData;
}

export const handle = {
  crumb: ({
    params,
    data,
  }: {
    params: { orgSlug: string; recipeId: string };
    data: Recipe;
  }) => {
    const recipeId = params.recipeId;
    return (
      <NavLink to={`/org/${params.orgSlug}/recipes/${recipeId}`}>
        {data.name}
      </NavLink>
    );
  },
};
export default function RecipeDetailsRouteModule() {
  return <Outlet />;
}
