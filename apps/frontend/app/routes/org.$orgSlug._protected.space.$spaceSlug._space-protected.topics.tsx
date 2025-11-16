import { NavLink, Outlet } from 'react-router';
import { routes } from '../../src/shared/utils/routes';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string; spaceSlug: string } }) => {
    return (
      <NavLink to={routes.space.toTopics(params.orgSlug, params.spaceSlug)}>
        Topics
      </NavLink>
    );
  },
};

export default function TopicsRouteModule() {
  return <Outlet />;
}
