import { PMPage, PMTabs, PMVStack } from '@packmind/ui';

import { SpaceGeneralSettings } from './SpaceGeneralSettings';
import { SpaceMembersList } from './SpaceMembersList';

export function SpaceSettingsPage() {
  const tabs = [
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
  ];

  return (
    <PMPage title="Space settings">
      <PMTabs defaultValue={tabs[0]?.value ?? 'members'} tabs={tabs} />
    </PMPage>
  );
}
