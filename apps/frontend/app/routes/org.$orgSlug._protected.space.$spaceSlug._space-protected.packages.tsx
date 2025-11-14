import { NavLink, Outlet } from 'react-router';
import { routes } from '../../src/shared/utils/routes';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string; spaceSlug: string } }) => {
    return (
      <NavLink to={routes.space.toPackages(params.orgSlug, params.spaceSlug)}>
        Packages
      </NavLink>
    );
  },
};

export default function PackagesRouteModule() {
  return <Outlet />;
}
