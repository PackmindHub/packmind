import { PMIcon, PMText, PMVStack } from '@packmind/ui';
import { LuEyeOff } from 'react-icons/lu';

export function BinaryFilePlaceholder() {
  return (
    <PMVStack align="center" gap={2} py={8}>
      <PMIcon color="text.faded" boxSize={8}>
        <LuEyeOff />
      </PMIcon>
      <PMText fontSize="sm" color="faded">
        Binary file — cannot display diff
      </PMText>
    </PMVStack>
  );
}
