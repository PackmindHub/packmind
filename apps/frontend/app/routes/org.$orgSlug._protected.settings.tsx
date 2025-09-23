import { NavLink, Outlet } from 'react-router';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string } }) => {
    return <NavLink to={`/org/${params.orgSlug}/settings`}>Settings</NavLink>;
  },
};

export default function SettingsIndexRouteModule() {
  return <Outlet />;
}
