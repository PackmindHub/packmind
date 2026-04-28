import { PMBox, PMButton, PMText } from '@packmind/ui';
import type { Space } from '../types';

type DangerZoneProps = {
  space: Space;
};

export function DangerZone({ space }: Readonly<DangerZoneProps>) {
  return (
    <PMBox
      borderWidth="1px"
      borderColor="red.900"
      borderRadius="md"
      paddingX={4}
      paddingY={3}
    >
      <PMText as="p" fontSize="sm" fontWeight="semibold" color="error">
        Delete space
      </PMText>
      <PMText as="p" fontSize="xs" color="faded" marginTop={2}>
        Permanently remove the space and all of its skills, commands, and
        instructions. This cannot be undone.
      </PMText>
      <PMBox marginTop={2}>
        <PMButton variant="danger" size="xs">
          Delete {space.name}&hellip;
        </PMButton>
      </PMBox>
    </PMBox>
  );
}
