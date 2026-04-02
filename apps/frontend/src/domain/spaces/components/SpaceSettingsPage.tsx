import { PMPage, PMTabs, PMVStack } from '@packmind/ui';

import { SpaceGeneralSettings } from './SpaceGeneralSettings';
import { SpaceMembersList } from './SpaceMembersList';

export function SpaceSettingsPage() {
  return (
    <PMPage title="Space settings">
      <PMTabs
        defaultValue="general"
        tabs={[
          {
            value: 'general',
            triggerLabel: 'General',
            content: <SpaceGeneralSettings />,
          },
          {
            value: 'members',
            triggerLabel: 'Members',
            content: (
              <PMVStack align="stretch" pt={4}>
                <SpaceMembersList />
              </PMVStack>
            ),
          },
        ]}
      />
    </PMPage>
  );
}
