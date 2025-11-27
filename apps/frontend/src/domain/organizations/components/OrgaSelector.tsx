import React from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
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
import { LuBuilding, LuCirclePlus } from 'react-icons/lu';
import { NewOrganizationDialog } from './NewOrganizationDialog';
import { useGetUserOrganizationsQuery } from '../../accounts/api/queries/AccountsQueries';
import { ORGANIZATION_QUERY_SCOPE } from '../api/queryKeys';
import { routes } from '../../../shared/utils/routes';

interface ISidebarOrgaSelectorProps {
  currentOrganization: AuthContextOrganization;
}

export const SidebarOrgaSelector: React.FunctionComponent<
  ISidebarOrgaSelectorProps
> = ({ currentOrganization }) => {
  const [createOrgaDialogOpen, setCreateOrgaDialogOpen] = React.useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: organizations = [], isLoading } =
    useGetUserOrganizationsQuery();

  // Filter out the current organization from the list
  const availableOrganizations = organizations.filter(
    (org) => org.id !== currentOrganization.id,
  );

  const handleOrgaSelect = async (orgaId: string) => {
    const selectedOrg = organizations.find((org) => org.id === orgaId);
    if (!selectedOrg) return;

    // Cancel all in-flight organization-scoped queries to prevent 403/500 errors
    // from requests using the old organization context
    await queryClient.cancelQueries({
      queryKey: [ORGANIZATION_QUERY_SCOPE],
    });

    // Remove all organization-scoped queries from the cache to prevent
    // refetching with stale organization context during navigation
    queryClient.removeQueries({
      queryKey: [ORGANIZATION_QUERY_SCOPE],
    });

    // Navigate to the new organization's dashboard
    // The clientLoader in org.$orgSlug._protected.tsx will detect the org mismatch
    // and call validateAndSwitchIfNeeded to update the JWT token
    navigate(routes.org.toDashboard(selectedOrg.slug));
  };

  const handleOpenOrganizationCreation = () => {
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
              {isLoading ? (
                <PMText padding={2} color="secondary">
                  Loading organizations...
                </PMText>
              ) : (
                availableOrganizations.map((org) => (
                  <PMMenu.Item
                    key={org.id}
                    value={org.id}
                    onClick={() => handleOrgaSelect(org.id)}
                    cursor={'pointer'}
                  >
                    <PMText color="secondary">{org.name}</PMText>
                  </PMMenu.Item>
                ))
              )}
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
