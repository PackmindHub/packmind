import React, { useState } from 'react';
import { LuPlus } from 'react-icons/lu';
import { useQueryClient } from '@tanstack/react-query';
import { PMButton, PMHStack, PMIcon } from '@packmind/ui';
import { CreateSpaceDialog } from '../../../spaces-management/components/CreateSpaceDialog';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';

// const ADMIN_FILTER_ITEMS = [
//   { label: 'Admin: any', value: 'any' },
//   { label: 'Org admins', value: 'org-admins' },
//   { label: 'Individual users', value: 'individual' },
// ];

// const MEMBER_FILTER_ITEMS = [
//   { label: 'Member: any', value: 'any' },
//   { label: 'Org members', value: 'org-members' },
//   { label: 'Individual users', value: 'individual' },
// ];

export const SpacesToolbar: React.FC = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  const handleCreated = async () => {
    if (organization?.id) {
      await queryClient.invalidateQueries({
        queryKey: ['organizations', organization.id, 'spaces', 'management'],
      });
    }
    setIsCreateDialogOpen(false);
  };

  return (
    <>
      <PMHStack gap={2} align="center" flexWrap="nowrap">
        {/* <PMInput
          type="search"
          placeholder="Search spaces..."
          aria-label="Search spaces"
          size="sm"
          width="220px"
        />
        <PMNativeSelect
          items={ADMIN_FILTER_ITEMS}
          defaultValue="any"
          size="sm"
          aria-label="Filter by admin"
        />
        <PMNativeSelect
          items={MEMBER_FILTER_ITEMS}
          defaultValue="any"
          size="sm"
          aria-label="Filter by member"
        /> */}
        <PMButton
          variant="primary"
          size="sm"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <PMIcon>
            <LuPlus />
          </PMIcon>
          New space
        </PMButton>
      </PMHStack>
      <CreateSpaceDialog
        open={isCreateDialogOpen}
        setOpen={setIsCreateDialogOpen}
        redirectAfterCreate={false}
        onCreated={handleCreated}
      />
    </>
  );
};
