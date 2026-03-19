import { PMIconButton } from '@packmind/ui';
import { LuPlus } from 'react-icons/lu';

export function BrowseSpaces(): React.ReactElement {
  return (
    <PMIconButton
      aria-label="Browse spaces"
      size="2xs"
      variant="ghost"
      onClick={() => console.log('Browse spaces clicked')}
    >
      <LuPlus />
    </PMIconButton>
  );
}
