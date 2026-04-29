import { PMButton, PMHStack, PMIcon } from '@packmind/ui';
import { LuPlus, LuSearch } from 'react-icons/lu';
import { WireInput } from './WireInput';

type ToolbarProps = {
  searchPlaceholder?: string;
  onNewSpace?: () => void;
  extraFilters?: React.ReactNode;
};

export function Toolbar({
  searchPlaceholder = 'Search spaces\u2026',
  onNewSpace,
  extraFilters,
}: Readonly<ToolbarProps>) {
  return (
    <PMHStack gap={2} flexWrap="wrap">
      <PMHStack
        gap={2}
        borderWidth="1px"
        borderColor="border.tertiary"
        borderRadius="md"
        paddingX={3}
        paddingY={1.5}
        bg="background.primary"
        width="260px"
      >
        <PMIcon color="text.faded" fontSize="sm">
          <LuSearch />
        </PMIcon>
        <WireInput type="text" placeholder={searchPlaceholder} />
      </PMHStack>
      {extraFilters}
      <PMButton variant="primary" size="sm" onClick={onNewSpace}>
        <PMIcon fontSize="xs">
          <LuPlus />
        </PMIcon>
        New space
      </PMButton>
    </PMHStack>
  );
}
