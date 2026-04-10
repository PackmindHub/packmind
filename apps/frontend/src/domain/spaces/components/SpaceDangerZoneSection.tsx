import { Dialog, Portal } from '@chakra-ui/react';
import { useState } from 'react';
import { LuLogOut, LuTrash2 } from 'react-icons/lu';
import {
  PMButton,
  PMHeading,
  PMHStack,
  PMIcon,
  PMInput,
  PMPageSection,
  PMSeparator,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { Package } from '@packmind/types';

import { useLeaveSpaceMutation } from '../../spaces-management/api/queries/SpacesManagementQueries';
import { useCurrentSpace } from '../hooks/useCurrentSpace';
import { useDeleteSpaceMutation } from '../../spaces-management/api/queries/SpacesManagementQueries';
import { useNavigation } from '../../../shared/hooks/useNavigation';
import { useListPackagesBySpaceQuery } from '../../deployments/api/queries/DeploymentsQueries';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';

function LeaveSpaceConfirmationDialog({
  spaceName,
  onConfirm,
}: Readonly<{
  spaceName: string;
  onConfirm: () => void;
}>) {
  const [confirmationInput, setConfirmationInput] = useState('');

  const isConfirmEnabled = confirmationInput === spaceName;

  return (
    <Dialog.Root
      placement="center"
      onExitComplete={() => setConfirmationInput('')}
    >
      <Dialog.Trigger asChild>
        <PMButton variant="secondary" minW="180px">
          <PMIcon>
            <LuLogOut />
          </PMIcon>
          Leave this space
        </PMButton>
      </Dialog.Trigger>

      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Leave space</Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              <PMVStack gap={4} align="stretch">
                <PMText>
                  You are about to leave <strong>{spaceName}</strong>. You will
                  lose access to its standards, commands, skills, and other
                  content. You can rejoin later if the space is open or if an
                  admin invites you.
                </PMText>
                <PMVStack gap={2} align="stretch">
                  <PMText variant="body" fontSize="sm">
                    Type <strong>{spaceName}</strong> to confirm:
                  </PMText>
                  <PMInput
                    placeholder="Enter space name"
                    value={confirmationInput}
                    onChange={(e) => setConfirmationInput(e.target.value)}
                  />
                </PMVStack>
              </PMVStack>
            </Dialog.Body>

            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <PMButton variant="tertiary">Cancel</PMButton>
              </Dialog.ActionTrigger>
              <PMButton
                colorScheme="red"
                disabled={!isConfirmEnabled}
                onClick={onConfirm}
                ml={3}
              >
                Leave
              </PMButton>
            </Dialog.Footer>

            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function DeleteSpaceConfirmationDialog({
  spaceName,
  packages,
  isPending,
  onConfirm,
}: Readonly<{
  spaceName: string;
  packages: Package[];
  isPending: boolean;
  onConfirm: () => void;
}>) {
  const [confirmationInput, setConfirmationInput] = useState('');

  const isConfirmEnabled = confirmationInput === spaceName && !isPending;

  return (
    <Dialog.Root
      placement="center"
      onExitComplete={() => setConfirmationInput('')}
    >
      <Dialog.Trigger asChild>
        <PMButton variant="danger" minW="180px">
          <PMIcon>
            <LuTrash2 />
          </PMIcon>
          Delete this space
        </PMButton>
      </Dialog.Trigger>

      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Delete space</Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              <PMVStack gap={4} align="stretch">
                <PMText>
                  This will permanently delete <strong>{spaceName}</strong> and
                  all its standards, commands, skills, and members. This action
                  cannot be undone.
                </PMText>
                {packages.length > 0 && (
                  <PMVStack gap={2} align="stretch">
                    <PMText variant="body" fontSize="sm">
                      The following packages will be affected:
                    </PMText>
                    <PMVStack gap={1} align="stretch" pl={4}>
                      {packages.map((pkg) => (
                        <PMText key={pkg.id} variant="body" fontSize="sm">
                          - {pkg.name}
                        </PMText>
                      ))}
                    </PMVStack>
                    <PMText variant="body" fontSize="sm">
                      All deployments using these packages will stop receiving
                      updates.
                    </PMText>
                  </PMVStack>
                )}
                <PMVStack gap={2} align="stretch">
                  <PMText variant="body" fontSize="sm">
                    Type <strong>{spaceName}</strong> to confirm:
                  </PMText>
                  <PMInput
                    placeholder="Enter space name"
                    value={confirmationInput}
                    onChange={(e) => setConfirmationInput(e.target.value)}
                  />
                </PMVStack>
              </PMVStack>
            </Dialog.Body>

            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <PMButton variant="tertiary">Cancel</PMButton>
              </Dialog.ActionTrigger>
              <PMButton
                colorScheme="red"
                disabled={!isConfirmEnabled}
                onClick={onConfirm}
                ml={3}
              >
                Delete
              </PMButton>
            </Dialog.Footer>

            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

export function SpaceDangerZoneSection() {
  const { space } = useCurrentSpace();
  const leaveSpaceMutation = useLeaveSpaceMutation();
  const { organization } = useAuthContext();
  const deleteSpaceMutation = useDeleteSpaceMutation();
  const nav = useNavigation();
  const { data: packagesData } = useListPackagesBySpaceQuery(
    space?.id,
    organization?.id,
  );

  if (!space || space.isDefaultSpace) {
    return null;
  }

  return (
    <PMPageSection
      variant="outline"
      backgroundColor="primary"
      titleComponent={
        <PMHeading level="h3" fontSize={'lg'} fontWeight={'semibold'}>
          Danger zone
        </PMHeading>
      }
    >
      <PMVStack align="stretch" gap={5} pt={4} w="lg">
        <PMHStack justify="space-between" align="center">
          <PMVStack gap={1} align="flex-start">
            <PMText fontWeight="medium">Leave this space</PMText>
            <PMText variant="body" color="secondary" fontSize="sm">
              You will lose access to all standards, commands, skills, and other
              content. You can rejoin later if invited.
            </PMText>
          </PMVStack>
          <LeaveSpaceConfirmationDialog
            spaceName={space.name}
            onConfirm={() => {
              leaveSpaceMutation.mutate({ spaceId: space.id });
            }}
          />
        </PMHStack>

        {!space.isDefaultSpace && (
          <>
            <PMSeparator />

            <PMHStack justify="space-between" align="center">
              <PMVStack gap={1} align="flex-start">
                <PMText fontWeight="medium">Delete this space</PMText>
                <PMText variant="body" color="secondary" fontSize="sm">
                  Permanently remove this space and all its content. This action
                  cannot be undone.
                </PMText>
              </PMVStack>
              <DeleteSpaceConfirmationDialog
                spaceName={space.name}
                packages={packagesData?.packages ?? []}
                isPending={deleteSpaceMutation.isPending}
                onConfirm={() => {
                  deleteSpaceMutation.mutate(
                    { spaceId: space.id },
                    { onSuccess: () => nav.org.toDashboard() },
                  );
                }}
              />
            </PMHStack>
          </>
        )}
      </PMVStack>
    </PMPageSection>
  );
}
