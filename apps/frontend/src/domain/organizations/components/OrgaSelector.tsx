import React from 'react';
import {
  PMHStack,
  PMButton,
  PMMenu,
  PMPortal,
  PMText,
  PMIcon,
  PMBox,
} from '@packmind/ui';
import { AuthContextOrganization } from '../../accounts/hooks/useAuthContext';
import { Organization, OrganizationId } from '@packmind/shared/types';
import { LuBuilding, LuCirclePlus } from 'react-icons/lu';
import { NewOrganizationDialog } from './NewOrganizationDialog';

interface ISidebarOrgaSelectorProps {
  currentOrganization: AuthContextOrganization;
}

export const SidebarOrgaSelector: React.FunctionComponent<
  ISidebarOrgaSelectorProps
> = ({ currentOrganization }) => {
  const [createOrgaDialogOpen, setCreateOrgaDialogOpen] = React.useState(false);

  const mockedOrganizations: Organization[] = [
    { id: '1' as OrganizationId, name: 'Organization 1', slug: 'org-1' },
    { id: '2' as OrganizationId, name: 'Organization 2', slug: 'org-2' },
  ];

  const handleOrgaSelect = (orgaId: string) => {
    console.log('Selected organization ID:', orgaId);
    // Implement organization switch logic here
  };

  const handleOpenOrganizationCreation = () => {
    console.log('Open organization creation modal');
    setCreateOrgaDialogOpen(true);
  };

  return (
    <>
      <PMMenu.Root positioning={{ placement: 'bottom-start' }}>
        <PMMenu.Trigger asChild>
          <PMButton
            variant="secondary"
            width={'full'}
            justifyContent={'flex-start'}
            paddingY={'6'}
            paddingX={'2'}
          >
            <PMHStack overflow="hidden">
              <PMIcon color={'text.tertiary'}>
                <LuBuilding></LuBuilding>
              </PMIcon>
              <PMBox
                maxWidth={'full'}
                textOverflow={'ellipsis'}
                overflow={'hidden'}
                color="text.secondary"
              >
                {currentOrganization.name}
              </PMBox>
            </PMHStack>
          </PMButton>
        </PMMenu.Trigger>
        <PMPortal>
          <PMMenu.Positioner>
            <PMMenu.Content>
              {mockedOrganizations.map((org) => (
                <PMMenu.Item
                  key={org.id}
                  value={org.id}
                  onClick={() => handleOrgaSelect(org.id)}
                  cursor={'pointer'}
                >
                  <PMText color="secondary">{org.name}</PMText>
                </PMMenu.Item>
              ))}
              <PMMenu.Separator borderColor={'border.tertiary'} />
              <PMMenu.Item
                value="new-organizattion"
                onClick={handleOpenOrganizationCreation}
                cursor={'pointer'}
              >
                <PMText color="secondary">
                  <PMIcon marginRight={2}>
                    <LuCirclePlus />
                  </PMIcon>
                  New organization
                </PMText>
              </PMMenu.Item>
            </PMMenu.Content>
          </PMMenu.Positioner>
        </PMPortal>
      </PMMenu.Root>
      <NewOrganizationDialog
        open={createOrgaDialogOpen}
        setOpen={setCreateOrgaDialogOpen}
      />
    </>
  );
};
