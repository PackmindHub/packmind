import { NavLink, Outlet } from 'react-router';
import { routes } from '../../src/shared/utils/routes';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string; spaceSlug: string } }) => (
    <NavLink to={routes.space.toLearnings(params.orgSlug, params.spaceSlug)}>
      Learnings
    </NavLink>
  ),
};

export default function LearningsRouteModule() {
  return <Outlet />;
}
