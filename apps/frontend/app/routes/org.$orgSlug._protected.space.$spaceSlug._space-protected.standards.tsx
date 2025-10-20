import { NavLink, Outlet } from 'react-router';
import { routes } from '../../src/shared/utils/routes';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string; spaceSlug: string } }) => {
    return (
      <NavLink to={routes.space.toStandards(params.orgSlug, params.spaceSlug)}>
        Standards
      </NavLink>
    );
  },
};

export default function StandardsRouteModule() {
  return <Outlet />;
}
