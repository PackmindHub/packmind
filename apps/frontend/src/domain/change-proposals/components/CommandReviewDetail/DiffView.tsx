import { PMVStack } from '@packmind/ui';
import { DiffBlock } from './DiffBlock';

interface DiffViewProps {
  oldValue: string;
  newValue: string;
  isDescriptionField: boolean;
}

export function DiffView({
  oldValue,
  newValue,
  isDescriptionField,
}: Readonly<DiffViewProps>) {
  return (
    <PMVStack gap={3}>
      <DiffBlock
        value={oldValue}
        variant="removed"
        isMarkdown={isDescriptionField}
      />
      <DiffBlock
        value={newValue}
        variant="added"
        isMarkdown={isDescriptionField}
      />
    </PMVStack>
  );
}
