import { Outlet } from 'react-router';
import { SpaceContentSubscription } from '../../src/domain/deployments/components/SpaceContentSubscription';

/**
 * The layout every package address goes through, which is why the live
 * subscription is mounted here: the list, a package's page, its edit form and
 * the create form all read the same memberships, and one subscription outlives
 * navigation between them rather than being torn down and re-established on
 * each.
 */
export default function PackagesRouteModule() {
  return (
    <>
      <SpaceContentSubscription />
      <Outlet />
    </>
  );
}
