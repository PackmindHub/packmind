import { useMemo, useState } from 'react';
import slug from 'slug';
import { Space, SPACE_COLOR_PALETTES, SpaceColor } from '@packmind/types';
import {
  PMButton,
  PMColorSwatch,
  PMField,
  PMHeading,
  PMHStack,
  PMInput,
  PMPageSection,
  PMText,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import { useUpdateSpaceMutation } from '../../spaces-management/api/queries/SpacesManagementQueries';
import { isPackmindError } from '../../../services/api/errors/PackmindError';

interface SpaceIdentitySectionProps {
  space: Space;
  canEdit: boolean;
}

export function SpaceIdentitySection({
  space,
  canEdit,
}: Readonly<SpaceIdentitySectionProps>) {
  const [name, setName] = useState(space.name);
  const [selectedColor, setSelectedColor] = useState<SpaceColor>(space.color);
  const updateSpaceMutation = useUpdateSpaceMutation();

  const isDefaultSpace = space.isDefaultSpace;
  const nameDisabled = !canEdit || isDefaultSpace;
  const colorDisabled = !canEdit;

  const slugMismatchWarning = useMemo(() => {
    if (!name) return null;
    const candidate = slug(name);
    return candidate !== space.slug ? (
      <PMText color="warning" fontSize="xs">
        The space URL will remain <code>/spaces/{space.slug}</code>, which no
        longer matches the name.
      </PMText>
    ) : null;
  }, [name, space.slug]);

  const hasChanges =
    (name !== space.name && !isDefaultSpace) || selectedColor !== space.color;

  const handleSave = async () => {
    const fields: { name?: string; color?: SpaceColor } = {};
    if (name !== space.name && !isDefaultSpace) fields.name = name;
    if (selectedColor !== space.color) fields.color = selectedColor;
    if (Object.keys(fields).length === 0) return;

    try {
      await updateSpaceMutation.mutateAsync({ spaceId: space.id, fields });
      pmToaster.create({
        type: 'success',
        title: 'Space updated',
      });
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
      <PMVStack align="stretch" gap={5} pt={4} w="lg">
        <PMField.Root disabled={nameDisabled}>
          <PMField.Label>Name</PMField.Label>
          <PMInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Space name"
            disabled={nameDisabled}
            aria-label="Name"
          />
          {isDefaultSpace && (
            <PMField.HelperText>
              The default space cannot be renamed.
            </PMField.HelperText>
          )}
          {slugMismatchWarning}
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
                transition="outline 0.15s"
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
            disabled={!canEdit || !hasChanges || updateSpaceMutation.isPending}
            loading={updateSpaceMutation.isPending}
          >
            Save changes
          </PMButton>
        </PMHStack>
      </PMVStack>
    </PMPageSection>
  );
}
