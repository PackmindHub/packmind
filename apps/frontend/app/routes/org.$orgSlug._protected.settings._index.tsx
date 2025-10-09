import { redirect, Outlet } from 'react-router';

export function clientLoader() {
  return redirect('users');
}

export default function SettingsIndexRouteModule() {
  return <Outlet />;
}
