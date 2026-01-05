import { redirect } from 'react-router';
import { routes } from '../../src/shared/utils/routes';

export function clientLoader({
  params,
}: {
  params: { orgSlug: string; spaceSlug: string };
}) {
  return redirect(routes.space.toCommands(params.orgSlug, params.spaceSlug));
}

export default function RecipesIndexRedirectRouteModule() {
  return null;
}
