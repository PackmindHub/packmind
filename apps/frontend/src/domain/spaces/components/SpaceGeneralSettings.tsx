import {
  DEFAULT_FEATURE_DOMAIN_MAP,
  PMFeatureFlag,
  PMVStack,
  SPACE_IDENTITY_FEATURE_KEY,
} from '@packmind/ui';

import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useGetSpaceMembersQuery } from '../api/queries/SpacesQueries';
import { useCurrentSpace } from '../hooks/useCurrentSpace';
import { SpaceAccessSection } from './SpaceAccessSection';
import { SpaceDangerZoneSection } from './SpaceDangerZoneSection';
import { SpaceIdentitySection } from './SpaceIdentitySection';

export function SpaceGeneralSettings() {
  const { space, spaceId } = useCurrentSpace();
  const { user, organization } = useAuthContext();
  const { data } = useGetSpaceMembersQuery(spaceId ?? '');

  const currentUserMember = data?.members?.find((m) => m.userId === user?.id);
  const isSpaceAdmin = currentUserMember?.role === 'admin';
  const isOrgAdmin = organization?.role === 'admin';
  const canDeleteSpace = isSpaceAdmin || isOrgAdmin;

  return (
    <PMVStack align="stretch" gap={6} pt={4}>
      {isSpaceAdmin && (
        <PMFeatureFlag
          featureKeys={[SPACE_IDENTITY_FEATURE_KEY]}
          featureDomainMap={DEFAULT_FEATURE_DOMAIN_MAP}
          userEmail={user?.email}
        >
          <SpaceIdentitySection />
        </PMFeatureFlag>
      )}
      {isSpaceAdmin && !space?.isDefaultSpace && <SpaceAccessSection />}
      {!space?.isDefaultSpace && (
        <SpaceDangerZoneSection canDeleteSpace={canDeleteSpace} />
      )}
    </PMVStack>
  );
}
