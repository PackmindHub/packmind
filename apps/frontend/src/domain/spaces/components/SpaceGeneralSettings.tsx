import { PMVStack } from '@packmind/ui';

import { SpaceAccessSection } from './SpaceAccessSection';
import { SpaceDangerZoneSection } from './SpaceDangerZoneSection';
import { SpaceIdentitySection } from './SpaceIdentitySection';
import { SpaceLeaveSection } from './SpaceLeaveSection';

export function SpaceGeneralSettings() {
  return (
    <PMVStack align="stretch" gap={6} pt={4}>
      <SpaceIdentitySection />
      <SpaceAccessSection />
      <SpaceLeaveSection />
      <SpaceDangerZoneSection />
    </PMVStack>
  );
}
