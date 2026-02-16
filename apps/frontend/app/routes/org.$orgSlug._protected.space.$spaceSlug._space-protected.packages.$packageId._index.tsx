import { useParams } from 'react-router';
import { PMPage, PMBox } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { PackageDetails } from '../../src/domain/deployments/components/PackageDetails';
import { PackageId } from '@packmind/types';

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
