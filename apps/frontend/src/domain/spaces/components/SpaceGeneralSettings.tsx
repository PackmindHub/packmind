import { PMVStack } from '@packmind/ui';

import { SpaceAccessSection } from './SpaceAccessSection';
import { SpaceDangerZoneSection } from './SpaceDangerZoneSection';
import { SpaceIdentitySection } from './SpaceIdentitySection';

export function SpaceGeneralSettings() {
  return (
    <PMVStack align="stretch" gap={6} pt={4}>
      <SpaceIdentitySection />
      <SpaceAccessSection />
      <SpaceDangerZoneSection />
    </PMVStack>
  );
}
