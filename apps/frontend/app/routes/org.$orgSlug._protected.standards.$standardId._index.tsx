import { useLoaderData } from 'react-router';
import { PMPage } from '@packmind/ui';
import { PMBox } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { StandardDetails } from '../../src/domain/standards/components/StandardDetails';
import { queryClient } from '../../src/shared/data/queryClient';
import { getStandardByIdOptions } from '../../src/domain/standards/api/queries/StandardsQueries';
import { StandardId } from '@packmind/standards';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';

export function clientLoader({ params }: { params: { standardId: string } }) {
  const standardData = queryClient.ensureQueryData(
    getStandardByIdOptions(params.standardId as StandardId),
  );
  return standardData;
}

export default function StandardDetailIndexRouteModule() {
  const standard = useLoaderData();
  const { organization } = useAuthContext();

  if (!organization) {
    return null;
  }

  if (!standard) {
    return (
      <PMPage
        title="Standard Not Found"
        subtitle="No standard ID provided"
        breadcrumbComponent={<AutobreadCrumb />}
      >
        <PMBox>
          <p>
            The standard you're looking for doesn't exist or the ID is invalid.
          </p>
        </PMBox>
      </PMPage>
    );
  }

  return <StandardDetails standard={standard} orgSlug={organization.slug} />;
}
