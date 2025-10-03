import { NavLink } from 'react-router';
import { SettingsPage } from '../../src/domain/accounts/components/SettingsPage';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string; standardId: string } }) => {
    return (
      <NavLink to={`/org/${params.orgSlug}/account-settings`}>
        Account settings
      </NavLink>
    );
  },
};

export default function SettingsRouteModule() {
  return <SettingsPage />;
}
