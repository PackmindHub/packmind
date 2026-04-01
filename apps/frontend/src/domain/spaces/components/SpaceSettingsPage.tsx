import { PMPage, PMPageSection, PMTabs, PMVStack } from '@packmind/ui';

import { SpaceMembersList } from './SpaceMembersList';

export function SpaceSettingsPage() {
  return (
    <PMPage title="Space settings" subtitle="Manage your space">
      <PMTabs
        defaultValue="general"
        tabs={[
          {
            value: 'general',
            triggerLabel: 'General',
            content: (
              <PMVStack align="stretch" pt={4}>
                <PMPageSection title="General" backgroundColor="primary">
                  General settings will appear here.
                </PMPageSection>
              </PMVStack>
            ),
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
