import { NavLink, Outlet } from 'react-router';
import { routes } from '../../src/shared/utils/routes';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string; spaceSlug: string } }) => {
    return (
      <NavLink to={routes.space.toCommands(params.orgSlug, params.spaceSlug)}>
        Commands
      </NavLink>
    );
  },
};

export default function CommandsRouteModule() {
  return <Outlet />;
}
