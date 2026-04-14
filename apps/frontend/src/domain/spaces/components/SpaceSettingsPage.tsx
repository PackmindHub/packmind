import { PMPage, PMTabs, PMVStack } from '@packmind/ui';

import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useGetSpaceMembersQuery } from '../api/queries/SpacesQueries';
import { useCurrentSpace } from '../hooks/useCurrentSpace';
import { SpaceGeneralSettings } from './SpaceGeneralSettings';
import { SpaceMembersList } from './SpaceMembersList';

export function SpaceSettingsPage() {
  const { space, spaceId } = useCurrentSpace();
  const { user } = useAuthContext();
  const { data } = useGetSpaceMembersQuery(spaceId ?? '');

  const currentUserMember = data?.members?.find((m) => m.userId === user?.id);
  const isSpaceAdmin = currentUserMember?.role === 'admin';
  const showGeneralTab = isSpaceAdmin && !space?.isDefaultSpace;

  const tabs = [
    ...(showGeneralTab
      ? [
          {
            value: 'general',
            triggerLabel: 'General',
            content: <SpaceGeneralSettings />,
          },
        ]
      : []),
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
