import { useState } from 'react';
import { LuLogOut, LuTrash2 } from 'react-icons/lu';
import {
  PMButton,
  PMHeading,
  PMHStack,
  PMIcon,
  PMPageSection,
  PMSeparator,
  PMText,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import { Package, Space, SpaceType } from '@packmind/types';

import {
  useLeaveSpaceMutation,
  useDeleteSpaceMutation,
} from '@packmind/proprietary/frontend/domain/spaces-management/api/queries/SpacesManagementQueries';
import { useNavigation } from '../../../shared/hooks/useNavigation';
import { useListPackagesBySpaceQuery } from '../../deployments/api/queries/DeploymentsQueries';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { TypeToConfirmDialog } from '../../../shared/components/TypeToConfirmDialog';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBusy = isPending || isSubmitting;

  const handleConfirm = () => {
    setIsSubmitting(true);
    onConfirm(() => {
      setIsSubmitting(false);
      setOpen(false);
    });
  };

  return (
    <>
      <PMButton variant="secondary" minW="180px" onClick={() => setOpen(true)}>
        <PMIcon>
          <LuLogOut />
        </PMIcon>
        Leave this space
      </PMButton>
      <TypeToConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Leave space"
        expectedValue={spaceName}
        inputPlaceholder="Enter space name"
        confirmLabel="Leave"
        isPending={isBusy}
        onConfirm={handleConfirm}
      >
        <PMText>
          You are about to leave <strong>{spaceName}</strong>. You will lose
          access to its standards, commands, skills, and other content.{' '}
          {spaceType === SpaceType.open
            ? 'You can rejoin whenever you want.'
            : "You'll have to ask an administrator to rejoin."}
        </PMText>
      </TypeToConfirmDialog>
    </>
  );
}

function DeleteSpaceConfirmationDialog({
  spaceName,
  packages,
  isPending,
  isDisabled,
  onConfirm,
}: Readonly<{
  spaceName: string;
  packages: Package[];
  isPending: boolean;
  isDisabled: boolean;
  onConfirm: (onSettled: () => void) => void;
}>) {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    onConfirm(() => setOpen(false));
  };

  return (
    <>
      <PMButton
        variant="danger"
        minW="180px"
        onClick={() => setOpen(true)}
        disabled={isDisabled}
      >
        <PMIcon>
          <LuTrash2 />
        </PMIcon>
        Delete this space
      </PMButton>
      <TypeToConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete space"
        expectedValue={spaceName}
        inputPlaceholder="Enter space name"
        confirmLabel="Delete"
        isPending={isPending}
        onConfirm={handleConfirm}
      >
        <PMText>
          This will permanently delete <strong>{spaceName}</strong> and all its
          standards, commands, and skills. This action cannot be undone.
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
              All deployments using these packages will stop receiving updates.
            </PMText>
          </PMVStack>
        )}
      </TypeToConfirmDialog>
    </>
  );
}

interface SpaceDangerZoneSectionProps {
  space: Space;
  canDelete: boolean;
  onDeleted?: () => void;
}

export function SpaceDangerZoneSection({
  space,
  canDelete,
  onDeleted,
}: Readonly<SpaceDangerZoneSectionProps>) {
  const leaveSpaceMutation = useLeaveSpaceMutation();
  const { organization } = useAuthContext();
  const deleteSpaceMutation = useDeleteSpaceMutation();
  const nav = useNavigation();
  const { data: packagesData } = useListPackagesBySpaceQuery(
    space.id,
    organization?.id,
  );

  if (space.isDefaultSpace) {
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
            isDisabled={!canDelete}
            onConfirm={(onSettled) => {
              deleteSpaceMutation.mutate(
                { spaceId: space.id },
                {
                  onSuccess: () => {
                    onSettled();
                    if (onDeleted) {
                      onDeleted();
                    } else {
                      nav.org.toDashboard();
                    }
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
      </PMVStack>
    </PMPageSection>
  );
}
