import type { LoaderFunctionArgs } from 'react-router';
import { useLoaderData } from 'react-router';
import {
  DEFAULT_FEATURE_DOMAIN_MAP,
  ORGA_SPACE_MANAGEMENT_FEATURE_KEY,
  PMFeatureFlag,
  PMPage,
} from '@packmind/ui';
import { queryClient } from '../../src/shared/data/queryClient';
import { ensureOrgContext } from '../../src/shared/data/ensureOrgContext';
import { getOrganizationSpacesForManagementQueryOptions } from '../../src/domain/spaces/api/queries/SpacesQueries';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { SpacesManagementPage } from '../../src/domain/spaces/components/SpacesManagementPage';
import { SpacesToolbar } from '../../src/domain/spaces/components/SpacesManagementPage/SpacesToolbar';

export async function clientLoader({ params }: LoaderFunctionArgs) {
  const me = await ensureOrgContext(params.orgSlug!);
  try {
    const data = await queryClient.ensureQueryData(
      getOrganizationSpacesForManagementQueryOptions(me.organization.id, 1),
    );
    return { totalCount: data.totalCount };
  } catch {
    return { totalCount: null };
  }
}

export default function SettingsSpacesRouteModule() {
  const { user, organization } = useAuthContext();
  const { totalCount } = useLoaderData<typeof clientLoader>();

  if (!organization) {
    return null;
  }

  const subtitle =
    totalCount === null
      ? 'Manage every space in your organization'
      : `Manage every space in your organization · ${totalCount} ${
          totalCount === 1 ? 'space' : 'spaces'
        }`;

  return (
    <PMFeatureFlag
      featureKeys={[ORGA_SPACE_MANAGEMENT_FEATURE_KEY]}
      featureDomainMap={DEFAULT_FEATURE_DOMAIN_MAP}
      userEmail={user?.email}
    >
      <PMPage title="Spaces" subtitle={subtitle} actions={<SpacesToolbar />}>
        <SpacesManagementPage />
      </PMPage>
    </PMFeatureFlag>
  );
}
