import { useState } from 'react';
import {
  PMButton,
  PMColorSwatch,
  PMField,
  PMHeading,
  PMHStack,
  PMInput,
  PMPageSection,
  PMVStack,
} from '@packmind/ui';

const SPACE_COLOR_PALETTES = [
  'red',
  'orange',
  'yellow',
  'green',
  'teal',
  'blue',
  'cyan',
  'purple',
  'pink',
] as const;

type SpaceColor = (typeof SPACE_COLOR_PALETTES)[number];

const MOCK_SPACE = {
  name: 'My Space',
  color: 'blue' as SpaceColor,
};

export function SpaceIdentitySection() {
  const [name, setName] = useState(MOCK_SPACE.name);
  const [selectedColor, setSelectedColor] = useState<SpaceColor>(
    MOCK_SPACE.color,
  );

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
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Space name"
          />
        </PMField.Root>

        <PMField.Root>
          <PMField.Label>Color</PMField.Label>
          <PMHStack gap={3} flexWrap="wrap">
            {SPACE_COLOR_PALETTES.map((color) => (
              <PMColorSwatch
                key={color}
                value={`{colors.${color}.solid}`}
                cursor="pointer"
                outline={selectedColor === color ? '2px solid' : 'none'}
                outlineColor={
                  selectedColor === color ? `${color}.solid` : undefined
                }
                outlineOffset="2px"
                transition="outline 0.15s"
                _hover={{ opacity: 0.8 }}
                aria-label={`Select ${color} color`}
                onClick={() => setSelectedColor(color)}
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
            onClick={() => {
              /* TODO: wire to API */
            }}
          >
            Save changes
          </PMButton>
        </PMHStack>
      </PMVStack>
    </PMPageSection>
  );
}
