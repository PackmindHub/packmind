import {
  DEFAULT_FEATURE_DOMAIN_MAP,
  ORGA_SPACE_MANAGEMENT_FEATURE_KEY,
  PMFeatureFlag,
  PMPage,
} from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { SpacesManagementPage } from '../../src/domain/spaces/components/SpacesManagementPage';
import { SpacesToolbar } from '../../src/domain/spaces/components/SpacesManagementPage/SpacesToolbar';

export default function SettingsSpacesRouteModule() {
  const { user, organization } = useAuthContext();

  if (!organization) {
    return null;
  }

  return (
    <PMFeatureFlag
      featureKeys={[ORGA_SPACE_MANAGEMENT_FEATURE_KEY]}
      featureDomainMap={DEFAULT_FEATURE_DOMAIN_MAP}
      userEmail={user?.email}
    >
      <PMPage
        title="Spaces"
        subtitle="Manage every space in your organization · 32 spaces"
        actions={<SpacesToolbar />}
      >
        <SpacesManagementPage />
      </PMPage>
    </PMFeatureFlag>
  );
}
