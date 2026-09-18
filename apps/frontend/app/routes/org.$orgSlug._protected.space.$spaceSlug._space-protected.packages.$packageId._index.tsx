import { useParams, type LoaderFunctionArgs } from 'react-router';
import { PMPage, PMBox } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { PackageDetails } from '../../src/domain/deployments/components/PackageDetails';
import { PackageId } from '@packmind/types';
import { redirectToContextPackage } from '../../src/shared/data/redirectToContext';

/**
 * The bare address of a package, which is what every link to a package in the
 * product was built from. In the plugin-first navigation it opens in the
 * Context rail instead of on a page that navigation does not list.
 *
 * On this route and not on the layout above it, for the reason the standard's
 * index gives: the layout carries `edit`, and a package is still edited on a
 * form of its own in both navigations. A redirect placed there would take that
 * form with it and leave no way to rename a package at all.
 */
export async function clientLoader(args: LoaderFunctionArgs) {
  return redirectToContextPackage(args, args.params.packageId as string);
}

export default function PackageDetailsIndexRouteModule() {
  const { packageId, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
    packageId: string;
  }>();
  const { organization } = useAuthContext();

  if (!organization) {
    return null;
  }

  if (!packageId || !spaceSlug) {
    return (
      <PMPage title="Package Not Found" subtitle="No package ID provided">
        <PMBox>
          <p>
            The package you're looking for doesn't exist or the ID is invalid.
          </p>
        </PMBox>
      </PMPage>
    );
  }

  return (
    <PackageDetails
      id={packageId as PackageId}
      orgSlug={organization.slug}
      spaceSlug={spaceSlug}
    />
  );
}
