import React, { useState, useMemo } from 'react';
import { LuPlus, LuX } from 'react-icons/lu';

import {
  PMButton,
  PMButtonGroup,
  PMCloseButton,
  PMCombobox,
  PMDialog,
  PMHStack,
  PMIcon,
  PMNativeSelect,
  PMPortal,
  PMText,
  PMVStack,
  pmToaster,
  pmCreateListCollection,
  pmUseFilter,
} from '@packmind/ui';

import { UserAvatarWithInitials } from '../../accounts/components/UserAvatarWithInitials';
import { useGetUsersInMyOrganizationQuery } from '../../accounts/api/queries/UserQueries';
import { useAddMembersToSpaceMutation } from '../api/queries/SpacesQueries';
import { SpaceMemberEntry, SpaceMemberRole } from '../types';
import { SpaceMember } from './SpaceMembersTable';

interface UserSearchComboboxProps {
  items: { label: string; value: string }[];
  onSelect: (userIds: string[]) => void;
  disabled: boolean;
}

function UserSearchCombobox({
  items,
  onSelect,
  disabled,
}: Readonly<UserSearchComboboxProps>) {
  const [inputValue, setInputValue] = useState('');
  const { contains } = pmUseFilter({ sensitivity: 'base' });

  const collection = useMemo(
    () =>
      pmCreateListCollection({
        items: inputValue
          ? items.filter((item) => contains(item.label, inputValue))
          : items,
      }),
    [items, inputValue, contains],
  );

  return (
    <PMCombobox.Root
      collection={collection}
      onInputValueChange={(e: { inputValue: string }) =>
        setInputValue(e.inputValue)
      }
      onValueChange={(details: { value: string[] }) => onSelect(details.value)}
      value={[]}
      multiple
      openOnClick
      placeholder="e.g., alice.wilson"
      width="full"
      disabled={disabled}
    >
      <PMCombobox.Control>
        <PMVStack gap={0} width="full">
          <PMCombobox.Input />
          <PMCombobox.IndicatorGroup>
            <PMCombobox.ClearTrigger />
            <PMCombobox.Trigger />
          </PMCombobox.IndicatorGroup>
        </PMVStack>
      </PMCombobox.Control>

      <PMPortal>
        <PMCombobox.Positioner>
          <PMCombobox.Content>
            <PMCombobox.Empty>No users found</PMCombobox.Empty>
            {collection.items.map((item) => (
              <PMCombobox.Item item={item} key={item.value}>
                <PMCombobox.ItemText>{item.label}</PMCombobox.ItemText>
                <PMCombobox.ItemIndicator />
              </PMCombobox.Item>
            ))}
          </PMCombobox.Content>
        </PMCombobox.Positioner>
      </PMPortal>
    </PMCombobox.Root>
  );
}

interface AddSpaceMembersDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  spaceId: string;
  existingMembers: SpaceMember[];
}

export const AddSpaceMembersDialog: React.FC<AddSpaceMembersDialogProps> = ({
  open,
  setOpen,
  spaceId,
  existingMembers,
}) => {
  const [selectedMembers, setSelectedMembers] = useState<SpaceMemberEntry[]>(
    [],
  );
  const { mutateAsync: addMembers, isPending } =
    useAddMembersToSpaceMutation(spaceId);
  const { data: orgUsersData } = useGetUsersInMyOrganizationQuery();
  const orgUsers = useMemo(() => orgUsersData?.users ?? [], [orgUsersData]);

  const comboboxItems = useMemo(() => {
    const existingIds = new Set(existingMembers.map((m) => m.id));
    const selectedIds = new Set(selectedMembers.map((m) => m.userId));
    return orgUsers
      .filter((u) => !existingIds.has(u.userId) && !selectedIds.has(u.userId))
      .map((u) => ({ label: u.displayName, value: u.userId }));
  }, [existingMembers, selectedMembers, orgUsers]);

  const handleUserSelect = (userIds: string[]) => {
    if (userIds.length === 0) return;

    const newEntries: SpaceMemberEntry[] = userIds
      .filter((id) => !selectedMembers.some((m) => m.userId === id))
      .map((userId) => ({ userId, role: 'member' as SpaceMemberRole }));

    if (newEntries.length > 0) {
      setSelectedMembers((prev) => [...prev, ...newEntries]);
    }
  };

  const removeUser = (userId: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.userId !== userId));
  };

  const setUserRole = (userId: string, role: SpaceMemberRole) => {
    setSelectedMembers((prev) =>
      prev.map((m) => (m.userId === userId ? { ...m, role } : m)),
    );
  };

  const getDisplayName = (userId: string) =>
    orgUsers.find((u) => u.userId === userId)?.displayName ?? userId;

  const handleSubmit = async () => {
    if (selectedMembers.length === 0) return;

    try {
      await addMembers(selectedMembers);
      setOpen(false);
      setSelectedMembers([]);

      pmToaster.create({
        type: 'success',
        title: 'Members added',
        description: `${selectedMembers.length} member(s) added to the space.`,
      });
    } catch (error) {
      pmToaster.create({
        type: 'error',
        title: 'Failed to add members',
        description:
          (error as Error)?.message || 'An unexpected error occurred.',
      });
    }
  };

  const handleOpenChange = (details: { open: boolean }) => {
    setOpen(details.open);
    if (!details.open) {
      setSelectedMembers([]);
    }
  };

  return (
    <PMDialog.Root
      closeOnInteractOutside={false}
      open={open}
      onOpenChange={handleOpenChange}
      size="lg"
      scrollBehavior="inside"
    >
      <PMDialog.Backdrop />
      <PMDialog.Positioner>
        <PMDialog.Content>
          <PMDialog.Header>
            <PMDialog.Title>Add members to space</PMDialog.Title>
            <PMDialog.CloseTrigger asChild>
              <PMCloseButton />
            </PMDialog.CloseTrigger>
          </PMDialog.Header>
          <PMDialog.Body>
            <PMVStack gap={4} alignItems="stretch">
              <UserSearchCombobox
                items={comboboxItems}
                onSelect={handleUserSelect}
                disabled={isPending}
              />

              {selectedMembers.length > 0 && (
                <PMVStack gap={2} alignItems="stretch">
                  {selectedMembers.map((member) => {
                    const displayName = getDisplayName(member.userId);
                    return (
                      <PMHStack
                        key={member.userId}
                        gap={3}
                        padding={2}
                        borderRadius="md"
                        border="1px solid"
                        borderColor="border.secondary"
                      >
                        <UserAvatarWithInitials
                          displayName={displayName}
                          size="sm"
                        />
                        <PMText flex={1}>{displayName}</PMText>
                        <PMNativeSelect
                          size="sm"
                          value={member.role}
                          onChange={(e) =>
                            setUserRole(
                              member.userId,
                              e.target.value as SpaceMemberRole,
                            )
                          }
                          items={[
                            { value: 'admin', label: 'Admin' },
                            { value: 'member', label: 'Member' },
                          ]}
                          width="120px"
                        />
                        <PMButton
                          size="xs"
                          variant="ghost"
                          colorPalette="red"
                          onClick={() => removeUser(member.userId)}
                        >
                          <PMIcon>
                            <LuX />
                          </PMIcon>
                        </PMButton>
                      </PMHStack>
                    );
                  })}
                </PMVStack>
              )}
            </PMVStack>
          </PMDialog.Body>
          <PMDialog.Footer>
            <PMButtonGroup size="sm">
              <PMDialog.Trigger asChild>
                <PMButton variant="tertiary">Cancel</PMButton>
              </PMDialog.Trigger>
              <PMButton
                variant="primary"
                onClick={handleSubmit}
                disabled={isPending || selectedMembers.length === 0}
              >
                <PMIcon>
                  <LuPlus />
                </PMIcon>
                Add {selectedMembers.length > 0 ? selectedMembers.length : ''}{' '}
                member{selectedMembers.length !== 1 ? 's' : ''}
              </PMButton>
            </PMButtonGroup>
          </PMDialog.Footer>
        </PMDialog.Content>
      </PMDialog.Positioner>
    </PMDialog.Root>
  );
};
