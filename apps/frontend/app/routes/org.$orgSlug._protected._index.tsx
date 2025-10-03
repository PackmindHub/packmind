import { OrganizationHomePage } from '../../src/domain/accounts/components/OrganizationHomePage';

export default function OrganizationHomeRouteModule() {
  // Show organization home page for authenticated users in correct org
  return <OrganizationHomePage />;
}
