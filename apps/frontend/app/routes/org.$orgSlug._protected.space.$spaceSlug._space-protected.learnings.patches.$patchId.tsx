import { NavLink, Outlet } from 'react-router';
import { routes } from '../../src/shared/utils/routes';

export const handle = {
  crumb: ({
    params,
  }: {
    params: { orgSlug: string; spaceSlug: string; patchId: string };
  }) => (
    <NavLink
      to={routes.space.toLearningsPatch(
        params.orgSlug,
        params.spaceSlug,
        params.patchId,
      )}
    >
      Patch Details
    </NavLink>
  ),
};

export default function LearningsPatchRouteModule() {
  return <Outlet />;
}
