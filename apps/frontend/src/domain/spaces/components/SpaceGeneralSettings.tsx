import { PMVStack } from '@packmind/ui';

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
  const canEditIdentity = isSpaceAdmin || isOrgAdmin;
  const canDeleteSpace = isSpaceAdmin || isOrgAdmin;

  return (
    <PMVStack align="stretch" gap={6} pt={4}>
      {space && (
        <SpaceIdentitySection
          key={space.id}
          space={space}
          canEdit={canEditIdentity}
        />
      )}
      {isSpaceAdmin && !space?.isDefaultSpace && <SpaceAccessSection />}
      {!space?.isDefaultSpace && space && (
        <SpaceDangerZoneSection space={space} canDelete={canDeleteSpace} />
      )}
    </PMVStack>
  );
}
