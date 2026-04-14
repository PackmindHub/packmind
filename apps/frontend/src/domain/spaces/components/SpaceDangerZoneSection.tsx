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
  pmToaster,
} from '@packmind/ui';
import { Package, SpaceType } from '@packmind/types';

import {
  useLeaveSpaceMutation,
  useDeleteSpaceMutation,
} from '@packmind/proprietary/frontend/domain/spaces-management/api/queries/SpacesManagementQueries';
import { useCurrentSpace } from '../hooks/useCurrentSpace';
import { useNavigation } from '../../../shared/hooks/useNavigation';
import { useListPackagesBySpaceQuery } from '../../deployments/api/queries/DeploymentsQueries';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';

function LeaveSpaceConfirmationDialog({
  spaceName,
  spaceType,
  isPending,
  onConfirm,
}: Readonly<{
  spaceName: string;
  spaceType: SpaceType;
  isPending: boolean;
  onConfirm: (onSettled: () => void) => void;
}>) {
  const [open, setOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBusy = isPending || isSubmitting;
  const isConfirmEnabled = confirmationInput === spaceName && !isBusy;

  const handleOpenChange = (details: { open: boolean }) => {
    if (!isBusy) {
      setOpen(details.open);
    }
  };

  const handleConfirm = () => {
    setIsSubmitting(true);
    onConfirm(() => {
      setIsSubmitting(false);
      setOpen(false);
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isConfirmEnabled) {
      return;
    }
    handleConfirm();
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={handleOpenChange}
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
            <form onSubmit={handleSubmit}>
              <Dialog.Header>
                <Dialog.Title>Leave space</Dialog.Title>
              </Dialog.Header>

              <Dialog.Body>
                <PMVStack gap={4} align="stretch">
                  <PMText>
                    You are about to leave <strong>{spaceName}</strong>. You
                    will lose access to its standards, commands, skills, and
                    other content.{' '}
                    {spaceType === SpaceType.open
                      ? 'You can rejoin whenever you want.'
                      : "You'll have to ask an administrator to rejoin."}
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
                  <PMButton type="button" variant="tertiary" disabled={isBusy}>
                    Cancel
                  </PMButton>
                </Dialog.ActionTrigger>
                <PMButton
                  type="submit"
                  colorScheme="red"
                  disabled={!isConfirmEnabled}
                  loading={isBusy}
                  ml={3}
                >
                  Leave
                </PMButton>
              </Dialog.Footer>
            </form>

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
  onConfirm: (onSettled: () => void) => void;
}>) {
  const [open, setOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');

  const isConfirmEnabled = confirmationInput === spaceName && !isPending;

  const handleOpenChange = (details: { open: boolean }) => {
    if (!isPending) {
      setOpen(details.open);
    }
  };

  const handleConfirm = () => {
    onConfirm(() => setOpen(false));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isConfirmEnabled) {
      return;
    }
    handleConfirm();
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={handleOpenChange}
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
            <form onSubmit={handleSubmit}>
              <Dialog.Header>
                <Dialog.Title>Delete space</Dialog.Title>
              </Dialog.Header>

              <Dialog.Body>
                <PMVStack gap={4} align="stretch">
                  <PMText>
                    This will permanently delete <strong>{spaceName}</strong>{' '}
                    and all its standards, commands, and skills. This action
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
                  <PMButton
                    type="button"
                    variant="tertiary"
                    disabled={isPending}
                  >
                    Cancel
                  </PMButton>
                </Dialog.ActionTrigger>
                <PMButton
                  type="submit"
                  colorScheme="red"
                  disabled={!isConfirmEnabled}
                  loading={isPending}
                  ml={3}
                >
                  Delete
                </PMButton>
              </Dialog.Footer>
            </form>

            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

export function SpaceDangerZoneSection({
  canDeleteSpace,
}: Readonly<{ canDeleteSpace: boolean }>) {
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
              content.{' '}
              {space.type === SpaceType.open
                ? 'You can rejoin whenever you want.'
                : "You'll have to ask an administrator to rejoin."}
            </PMText>
          </PMVStack>
          <LeaveSpaceConfirmationDialog
            spaceName={space.name}
            spaceType={space.type}
            isPending={leaveSpaceMutation.isPending}
            onConfirm={(onSettled) => {
              leaveSpaceMutation.mutate(
                { spaceId: space.id },
                {
                  onSuccess: () => {
                    onSettled();
                    pmToaster.create({
                      type: 'success',
                      title: 'Left space',
                      description: `You've left ${space.name}.`,
                    });
                  },
                  onError: () => {
                    onSettled();
                    pmToaster.create({
                      type: 'error',
                      title: 'Failed to leave space',
                      description:
                        'An error occurred while leaving the space. Please try again.',
                    });
                  },
                },
              );
            }}
          />
        </PMHStack>

        {canDeleteSpace && (
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
                onConfirm={(onSettled) => {
                  deleteSpaceMutation.mutate(
                    { spaceId: space.id },
                    {
                      onSuccess: () => {
                        onSettled();
                        nav.org.toDashboard();
                      },
                      onError: () => {
                        onSettled();
                        pmToaster.create({
                          type: 'error',
                          title: 'Failed to delete space',
                          description:
                            'An error occurred while deleting the space. Please try again.',
                        });
                      },
                    },
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
