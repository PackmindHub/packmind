import { useState } from 'react';
import {
  PMButton,
  PMField,
  PMHeading,
  PMHStack,
  PMNativeSelect,
  PMPageSection,
  PMVStack,
} from '@packmind/ui';

type SpaceVisibility = 'public' | 'private';
type SpaceOpenness = 'open' | 'approval';

const VISIBILITY_OPTIONS = [
  { label: 'Public — visible to all organization members', value: 'public' },
  { label: 'Private — visible only to space members', value: 'private' },
];

const OPENNESS_OPTIONS = [
  { label: 'Open to all — anyone can join freely', value: 'open' },
  {
    label: 'Needs approval — members must be invited or approved',
    value: 'approval',
  },
];

const MOCK_SPACE = {
  visibility: 'public' as SpaceVisibility,
  openness: 'open' as SpaceOpenness,
};

export function SpaceAccessSection() {
  const [visibility, setVisibility] = useState<SpaceVisibility>(
    MOCK_SPACE.visibility,
  );
  const [openness, setOpenness] = useState<SpaceOpenness>(MOCK_SPACE.openness);

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
        <PMField.Root>
          <PMField.Label>Visibility</PMField.Label>
          <PMNativeSelect
            items={VISIBILITY_OPTIONS}
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as SpaceVisibility)}
          />
          <PMField.HelperText>
            Controls who can see this space and its content.
          </PMField.HelperText>
        </PMField.Root>

        <PMField.Root>
          <PMField.Label>Openness</PMField.Label>
          <PMNativeSelect
            items={OPENNESS_OPTIONS}
            value={openness}
            onChange={(e) => setOpenness(e.target.value as SpaceOpenness)}
          />
          <PMField.HelperText>
            Controls how new members can join this space.
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
