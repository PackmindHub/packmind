import { NavLink, Outlet } from 'react-router';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string } }) => {
    return <NavLink to={`/org/${params.orgSlug}/standards`}>Standards</NavLink>;
  },
};

export default function StandardsRouteModule() {
  return <Outlet />;
}
