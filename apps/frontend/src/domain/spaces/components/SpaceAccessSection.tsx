import { useState } from 'react';
import {
  PMButton,
  PMField,
  PMHeading,
  PMHStack,
  PMNativeSelect,
  PMPageSection,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import { SpaceType } from '@packmind/types';
import { useCurrentSpace } from '../hooks/useCurrentSpace';
import { useUpdateSpaceMutation } from '@packmind/proprietary/frontend/domain/spaces-management/api/queries/SpacesManagementQueries';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';

const ACCESS_STATUS_OPTIONS = [
  {
    label: 'Open — anyone in the organization can join',
    value: SpaceType.open,
  },
  // TODO: Re-enable when approval workflow is implemented
  // {
  //   label: 'Restricted — visible to everyone, approval required to join',
  //   value: SpaceType.restricted,
  // },
  {
    label: 'Private — accessible only to invited members',
    value: SpaceType.private,
  },
];

export function SpaceAccessSection() {
  const { space, spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();
  const isAdmin = organization?.role === 'admin';
  const updateMutation = useUpdateSpaceMutation();
  const [accessStatus, setAccessStatus] = useState<SpaceType | undefined>(
    undefined,
  );

  const currentType = accessStatus ?? space?.type ?? SpaceType.open;
  const hasChanges = accessStatus !== undefined && accessStatus !== space?.type;

  const handleSave = () => {
    if (!spaceId || !hasChanges) return;
    updateMutation.mutate(
      { spaceId, fields: { type: accessStatus } },
      {
        onSuccess: () => {
          setAccessStatus(undefined);
          pmToaster.create({
            type: 'success',
            title: 'Space visibility updated',
            closable: true,
          });
        },
        onError: () => {
          pmToaster.create({
            type: 'error',
            title: 'Failed to update space visibility',
            description: 'An unexpected error occurred. Please try again.',
          });
        },
      },
    );
  };

  return (
    <PMPageSection
      backgroundColor="primary"
      titleComponent={
        <PMHeading level="h3" fontSize={'lg'} fontWeight={'semibold'}>
          Access
        </PMHeading>
      }
    >
      <PMVStack align="stretch" gap={5} pt={4} w="lg">
        <PMField.Root disabled={!isAdmin}>
          <PMField.Label>Access status</PMField.Label>
          <PMNativeSelect
            items={ACCESS_STATUS_OPTIONS}
            value={currentType}
            onChange={(e) => setAccessStatus(e.target.value as SpaceType)}
          />
          <PMField.HelperText>
            {isAdmin
              ? 'Controls who can see and join this space.'
              : 'Only organization administrators can change space visibility.'}
          </PMField.HelperText>
        </PMField.Root>

        <PMHStack justify="flex-end">
          <PMButton
            variant="secondary"
            onClick={handleSave}
            disabled={!isAdmin || !hasChanges || updateMutation.isPending}
            loading={updateMutation.isPending}
          >
            Save changes
          </PMButton>
        </PMHStack>
      </PMVStack>
    </PMPageSection>
  );
}
