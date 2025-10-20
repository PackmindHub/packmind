import { NavLink, Outlet } from 'react-router';
import { routes } from '../../src/shared/utils/routes';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string; spaceSlug: string } }) => {
    return (
      <NavLink to={routes.space.toRecipes(params.orgSlug, params.spaceSlug)}>
        Recipes
      </NavLink>
    );
  },
};

export default function RecipesRouteModule() {
  return <Outlet />;
}
