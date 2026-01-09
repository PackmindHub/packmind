import { NavLink, Outlet } from 'react-router';
import { routes } from '../../src/shared/utils/routes';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string; spaceSlug: string } }) => {
    return (
      <NavLink to={routes.space.toSkills(params.orgSlug, params.spaceSlug)}>
        Skills
      </NavLink>
    );
  },
};

export default function SkillsRouteModule() {
  return <Outlet />;
}
