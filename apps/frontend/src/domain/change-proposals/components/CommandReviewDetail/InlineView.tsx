import { PMBox } from '@packmind/ui';
import { MilkdownProvider } from '@milkdown/react';
import { DiffMarkdownEditor } from '../../../../shared/components/editor/DiffMarkdownEditor';
import { renderDiffText } from '../../utils/renderDiffText';

interface InlineViewProps {
  oldValue: string;
  newValue: string;
  isDescriptionField: boolean;
}

export function InlineView({
  oldValue,
  newValue,
  isDescriptionField,
}: Readonly<InlineViewProps>) {
  if (isDescriptionField) {
    return (
      <PMBox>
        <MilkdownProvider>
          <DiffMarkdownEditor
            oldValue={oldValue}
            newValue={newValue}
            proposalNumbers={[]}
            paddingVariant="none"
          />
        </MilkdownProvider>
      </PMBox>
    );
  }

  return (
    <PMBox
      p={3}
      borderRadius="md"
      border="1px solid"
      borderColor="border.muted"
    >
      {renderDiffText(oldValue, newValue)}
    </PMBox>
  );
}
