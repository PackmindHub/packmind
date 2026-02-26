import { PMBox, PMInput } from '@packmind/ui';
import { MilkdownProvider } from '@milkdown/react';
import { MarkdownEditor } from '../../../../shared/components/editor/MarkdownEditor';

interface EditableProposalFieldProps {
  value: string;
  onChange: (value: string) => void;
  isDescriptionField: boolean;
}

export function EditableProposalField({
  value,
  onChange,
  isDescriptionField,
}: Readonly<EditableProposalFieldProps>) {
  if (isDescriptionField) {
    return (
      <PMBox border="1px solid" borderColor="border.muted" borderRadius="md">
        <MilkdownProvider>
          <MarkdownEditor
            defaultValue={value}
            onMarkdownChange={onChange}
            paddingVariant="none"
          />
        </MilkdownProvider>
      </PMBox>
    );
  }

  return (
    <PMInput
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size="sm"
    />
  );
}
