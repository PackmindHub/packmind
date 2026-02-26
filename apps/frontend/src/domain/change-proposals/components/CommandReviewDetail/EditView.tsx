import {
  PMBox,
  PMButton,
  PMHStack,
  PMLink,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { ChangeProposalType } from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { DiffBlock } from './DiffBlock';
import { EditableProposalField } from './EditableProposalField';
import { EditPreview } from './EditPreview';

interface EditViewProps {
  proposal: ChangeProposalWithConflicts;
  editedValue: string;
  onEditedValueChange: (value: string) => void;
  onResetToOriginal: () => void;
  onCancel: () => void;
  onSaveAndAccept: () => void;
  isModified: boolean;
}

export function EditView({
  proposal,
  editedValue,
  onEditedValueChange,
  onResetToOriginal,
  onCancel,
  onSaveAndAccept,
  isModified,
}: Readonly<EditViewProps>) {
  const isDescriptionField =
    proposal.type === ChangeProposalType.updateCommandDescription;
  const payload = proposal.payload as { oldValue: string; newValue: string };

  return (
    <PMVStack gap={4} alignItems="stretch">
      <DiffBlock
        value={payload.oldValue}
        variant="removed"
        isMarkdown={isDescriptionField}
      />

      <PMBox>
        <PMText fontSize="xs" fontWeight="semibold" color="secondary" mb={2}>
          New value
        </PMText>
        <EditableProposalField
          value={editedValue}
          onChange={onEditedValueChange}
          isDescriptionField={isDescriptionField}
        />
      </PMBox>

      {isDescriptionField && <EditPreview value={editedValue} />}

      {isModified && (
        <PMHStack gap={2} alignItems="center">
          <PMText fontSize="xs" color="secondary" fontStyle="italic">
            Modified from original proposal
          </PMText>
          <PMLink fontSize="xs" onClick={onResetToOriginal} cursor="pointer">
            Reset to original
          </PMLink>
        </PMHStack>
      )}

      <PMHStack gap={2} justifyContent="flex-end">
        <PMButton size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </PMButton>
        <PMButton size="sm" colorPalette="green" onClick={onSaveAndAccept}>
          Save &amp; Accept
        </PMButton>
      </PMHStack>
    </PMVStack>
  );
}
