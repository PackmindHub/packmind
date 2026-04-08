import { useState } from 'react';
import {
  PMButton,
  PMField,
  PMHeading,
  PMHStack,
  PMInput,
  PMPageSection,
  PMVStack,
} from '@packmind/ui';
import { useCurrentSpace } from '../hooks/useCurrentSpace';
import { useUpdateSpaceMutation } from '../../spaces-management/api/queries/SpacesManagementQueries';

export function SpaceIdentitySection() {
  const { space, spaceId } = useCurrentSpace();
  const updateMutation = useUpdateSpaceMutation();
  const [name, setName] = useState<string | undefined>(undefined);

  const currentName = name ?? space?.name ?? '';
  const hasChanges = name !== undefined && name !== space?.name;

  const handleSave = () => {
    if (!spaceId || !hasChanges || !currentName.trim()) return;
    updateMutation.mutate(
      { spaceId, fields: { name: currentName.trim() } },
      {
        onSuccess: () => {
          setName(undefined);
        },
      },
    );
  };

  return (
    <PMPageSection
      backgroundColor="primary"
      titleComponent={
        <PMHeading level="h3" fontSize={'lg'} fontWeight={'semibold'}>
          Space identity
        </PMHeading>
      }
    >
      <PMVStack align="stretch" gap={5} pt={4} w="lg">
        <PMField.Root>
          <PMField.Label>Name</PMField.Label>
          <PMInput
            value={currentName}
            onChange={(e) => setName(e.target.value)}
            placeholder="Space name"
          />
        </PMField.Root>

        <PMHStack justify="flex-end">
          <PMButton
            variant="secondary"
            onClick={handleSave}
            disabled={
              !hasChanges || !currentName.trim() || updateMutation.isPending
            }
            loading={updateMutation.isPending}
          >
            Save changes
          </PMButton>
        </PMHStack>
      </PMVStack>
    </PMPageSection>
  );
}
