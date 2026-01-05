import { redirect } from 'react-router';
import { routes } from '../../src/shared/utils/routes';

export function clientLoader({
  params,
}: {
  params: { orgSlug: string; spaceSlug: string; recipeId: string };
}) {
  return redirect(
    routes.space.toCommand(params.orgSlug, params.spaceSlug, params.recipeId),
  );
}

export default function RecipeDetailRedirectRouteModule() {
  return null;
}
