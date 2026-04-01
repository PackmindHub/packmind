import { PMPage, PMPageSection } from '@packmind/ui';

import { SpaceMembersList } from './SpaceMembersList';

export function SpaceSettingsPage() {
  return (
    <PMPage title="Space settings" subtitle="Manage your space">
      <SpaceMembersList />
    </PMPage>
  );
}
