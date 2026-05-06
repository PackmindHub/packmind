import { PMPage, PMTabs, PMVStack } from '@packmind/ui';

import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../hooks/useCurrentSpace';
import { useGetSpaceMembersQuery } from '../api/queries/SpacesQueries';
import { SpaceGeneralSettings } from './SpaceGeneralSettings';
import { SpaceMembersList } from './SpaceMembersList';

export function SpaceSettingsPage() {
  const { space, spaceId } = useCurrentSpace();
  const { user } = useAuthContext();
  const { data: membersData } = useGetSpaceMembersQuery(spaceId ?? '');

  const isSpaceAdmin =
    membersData?.members?.find((m) => m.userId === user?.id)?.role === 'admin';

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
          {space && (
            <SpaceMembersList space={space} isSpaceAdmin={isSpaceAdmin} />
          )}
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
