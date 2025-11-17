import { NavLink, Outlet } from 'react-router';
import { routes } from '../../src/shared/utils/routes';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string; spaceSlug: string } }) => {
    return (
      <NavLink to={routes.space.toRagLab(params.orgSlug, params.spaceSlug)}>
        RAG Lab
      </NavLink>
    );
  },
};

export default function RagLabRouteModule() {
  return <Outlet />;
}
