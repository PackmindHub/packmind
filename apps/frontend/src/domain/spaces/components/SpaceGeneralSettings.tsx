import { PMVStack } from '@packmind/ui';

import { useCurrentSpace } from '../hooks/useCurrentSpace';
import { SpaceAccessSection } from './SpaceAccessSection';
import { SpaceDangerZoneSection } from './SpaceDangerZoneSection';
import { SpaceIdentitySection } from './SpaceIdentitySection';

export function SpaceGeneralSettings() {
  const { space } = useCurrentSpace();

  return (
    <PMVStack align="stretch" gap={6} pt={4}>
      <SpaceIdentitySection />
      {!space?.isDefaultSpace && <SpaceAccessSection />}
      <SpaceDangerZoneSection />
    </PMVStack>
  );
}
