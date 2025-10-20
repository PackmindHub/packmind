import { NavLink } from 'react-router';
import { SettingsPage } from '../../src/domain/accounts/components/SettingsPage';
import { routes } from '../../src/shared/utils/routes';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string; standardId: string } }) => {
    return (
      <NavLink to={routes.org.toAccountSettings(params.orgSlug)}>
        Account settings
      </NavLink>
    );
  },
};

export default function SettingsRouteModule() {
  return <SettingsPage />;
}
