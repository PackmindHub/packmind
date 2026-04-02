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

type SpaceAccessStatus = 'open' | 'restricted' | 'private';

const ACCESS_STATUS_OPTIONS = [
  {
    label: 'Open — anyone in the organization can join',
    value: 'open',
  },
  {
    label: 'Restricted — visible to everyone, approval required to join',
    value: 'restricted',
  },
  {
    label: 'Private — accessible only to invited members',
    value: 'private',
  },
];

const MOCK_SPACE = {
  accessStatus: 'open' as SpaceAccessStatus,
};

export function SpaceAccessSection() {
  const [accessStatus, setAccessStatus] = useState<SpaceAccessStatus>(
    MOCK_SPACE.accessStatus,
  );

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
          <PMField.Label>Access status</PMField.Label>
          <PMNativeSelect
            items={ACCESS_STATUS_OPTIONS}
            value={accessStatus}
            onChange={(e) =>
              setAccessStatus(e.target.value as SpaceAccessStatus)
            }
          />
          <PMField.HelperText>
            Controls who can see and join this space.
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
