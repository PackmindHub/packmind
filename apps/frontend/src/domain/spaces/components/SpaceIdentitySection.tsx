import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Space, SPACE_COLOR_PALETTES, SpaceColor } from '@packmind/types';
import {
  PMAlert,
  PMButton,
  PMColorSwatch,
  PMField,
  PMHeading,
  PMHStack,
  PMInput,
  PMPageSection,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import { useUpdateSpaceMutation } from '../../spaces-management/api/queries/SpacesManagementQueries';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { isPackmindError } from '../../../services/api/errors/PackmindError';

interface SpaceIdentitySectionProps {
  space: Space;
  canEdit: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

export function SpaceIdentitySection({
  space,
  canEdit,
  onDirtyChange,
}: Readonly<SpaceIdentitySectionProps>) {
  const [name, setName] = useState(space.name);
  const [selectedColor, setSelectedColor] = useState<SpaceColor>(space.color);
  const updateSpaceMutation = useUpdateSpaceMutation();
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  const isDefaultSpace = space.isDefaultSpace;
  const nameDisabled = !canEdit || isDefaultSpace;
  const colorDisabled = !canEdit;

  const trimmedName = name.trim();
  const isNameValid = trimmedName.length > 0;
  const isNameDirty = trimmedName !== space.name && !isDefaultSpace;
  const isColorDirty = selectedColor !== space.color;
  const hasChanges = isNameDirty || isColorDirty;
  const showNameRequiredError = !nameDisabled && !isNameValid;

  useEffect(() => {
    onDirtyChange?.(hasChanges);
  }, [hasChanges, onDirtyChange]);

  useEffect(() => {
    return () => {
      onDirtyChange?.(false);
    };
  }, [onDirtyChange]);

  const handleSave = async () => {
    const fields: { name?: string; color?: SpaceColor } = {};
    if (isNameDirty) fields.name = trimmedName;
    if (isColorDirty) fields.color = selectedColor;
    if (Object.keys(fields).length === 0) return;

    try {
      await updateSpaceMutation.mutateAsync({ spaceId: space.id, fields });
      pmToaster.create({
        type: 'success',
        title: 'Space updated',
      });
      if (organization?.id) {
        queryClient.invalidateQueries({
          queryKey: ['organizations', organization.id, 'spaces', 'management'],
        });
      }
    } catch (err) {
      const status = isPackmindError(err) ? err.serverError.status : undefined;
      const messageByStatus: Record<number, string> = {
        400: 'Invalid color selected.',
        403: "You don't have permission to update this space.",
        409: 'Another space with a similar name already exists.',
        422: 'The default space cannot be renamed.',
      };
      pmToaster.create({
        type: 'error',
        title:
          (status !== undefined && messageByStatus[status]) ||
          'Failed to update the space.',
      });
    }
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
      <PMVStack align="stretch" gap={5} pt={4}>
        {!canEdit && (
          <PMAlert.Root status="info" size="sm">
            <PMAlert.Indicator />
            <PMAlert.Title>Read-only access</PMAlert.Title>
            <PMAlert.Description>
              Only space admins and organization admins can edit these settings.
            </PMAlert.Description>
          </PMAlert.Root>
        )}
        <PMField.Root disabled={nameDisabled} invalid={showNameRequiredError}>
          <PMField.Label>Name</PMField.Label>
          <PMInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Space name"
            disabled={nameDisabled}
            aria-label="Name"
          />
          {showNameRequiredError ? (
            <PMField.ErrorText>Name is required.</PMField.ErrorText>
          ) : isDefaultSpace ? (
            <PMField.HelperText>
              The default space cannot be renamed.
            </PMField.HelperText>
          ) : (
            <PMField.HelperText>
              Renaming doesn't change the space URL — links and bookmarks keep
              working.
            </PMField.HelperText>
          )}
        </PMField.Root>

        <PMField.Root disabled={colorDisabled}>
          <PMField.Label>Color</PMField.Label>
          <PMHStack gap={3} flexWrap="wrap">
            {SPACE_COLOR_PALETTES.map((color) => (
              <PMColorSwatch
                key={color}
                value={`{colors.${color}.solid}`}
                cursor={colorDisabled ? 'not-allowed' : 'pointer'}
                outline={selectedColor === color ? '2px solid' : 'none'}
                outlineColor={
                  selectedColor === color ? `${color}.solid` : undefined
                }
                outlineOffset="2px"
                _hover={colorDisabled ? undefined : { opacity: 0.8 }}
                aria-label={`Select ${color} color`}
                aria-disabled={colorDisabled}
                onClick={() => !colorDisabled && setSelectedColor(color)}
              />
            ))}
          </PMHStack>
          <PMField.HelperText>
            This color is used to identify the space in the sidebar.
          </PMField.HelperText>
        </PMField.Root>

        <PMHStack justify="flex-end">
          <PMButton
            variant="secondary"
            onClick={handleSave}
            disabled={
              !canEdit ||
              !hasChanges ||
              !isNameValid ||
              updateSpaceMutation.isPending
            }
            loading={updateSpaceMutation.isPending}
          >
            Save changes
          </PMButton>
        </PMHStack>
      </PMVStack>
    </PMPageSection>
  );
}
