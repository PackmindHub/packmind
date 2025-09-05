import { NavLink, Outlet } from 'react-router';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string } }) => {
    return <NavLink to={`/org/${params.orgSlug}/recipes`}>Recipes</NavLink>;
  },
};

export default function RecipesRouteModule() {
  return <Outlet />;
}
