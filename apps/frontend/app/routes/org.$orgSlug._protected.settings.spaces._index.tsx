import type { LoaderFunctionArgs } from 'react-router';
import {
  DEFAULT_FEATURE_DOMAIN_MAP,
  ORGA_SPACE_MANAGEMENT_FEATURE_KEY,
  PMFeatureFlag,
  PMPage,
} from '@packmind/ui';
import { queryClient } from '../../src/shared/data/queryClient';
import { ensureOrgContext } from '../../src/shared/data/ensureOrgContext';
import {
  getOrganizationSpacesForManagementQueryOptions,
  useGetOrganizationSpacesForManagementQuery,
} from '../../src/domain/spaces/api/queries/SpacesQueries';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { SpacesManagementPage } from '../../src/domain/spaces/components/SpacesManagementPage';
import { SpacesToolbar } from '../../src/domain/spaces/components/SpacesManagementPage/SpacesToolbar';

export async function clientLoader({ params }: LoaderFunctionArgs) {
  const me = await ensureOrgContext(params.orgSlug!);
  try {
    await queryClient.ensureQueryData(
      getOrganizationSpacesForManagementQueryOptions(me.organization.id, 1),
    );
  } catch {
    // Live query in the component will surface its own error/loading state.
  }
  return null;
}

export default function SettingsSpacesRouteModule() {
  const { user, organization } = useAuthContext();
  const { data } = useGetOrganizationSpacesForManagementQuery(
    organization?.id ?? '',
    1,
  );

  if (!organization) {
    return null;
  }

  const totalCount = data?.totalCount ?? null;
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
      <PMPage
        title="Spaces"
        subtitle={subtitle}
        actions={<SpacesToolbar />}
        isFullWidth
      >
        <SpacesManagementPage />
      </PMPage>
    </PMFeatureFlag>
  );
}
