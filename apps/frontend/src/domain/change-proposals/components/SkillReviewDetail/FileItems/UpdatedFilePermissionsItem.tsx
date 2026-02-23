import { PMAccordion, PMHStack, PMText } from '@packmind/ui';
import {
  CollectionItemUpdatePayload,
  SkillFile,
  SkillFileId,
} from '@packmind/types';
import { renderDiffText } from '../../../utils/renderDiffText';

export function UpdatedFilePermissionsItem({
  file,
  payload,
}: {
  file: SkillFile;
  payload: CollectionItemUpdatePayload<SkillFileId>;
}) {
  return (
    <PMAccordion.Item
      key={file.id}
      value={file.id}
      borderRadius="md"
      border="1px solid"
      borderColor="border.primary"
    >
      <PMAccordion.ItemTrigger cursor="pointer" bg="background.primary" px={2}>
        <PMAccordion.ItemIndicator />
        <PMText fontSize="sm" fontWeight="semibold">
          {file.path}
        </PMText>
      </PMAccordion.ItemTrigger>
      <PMAccordion.ItemContent>
        <PMHStack gap={1}>
          <PMText fontSize="sm" fontWeight="bold">
            Permissions:
          </PMText>
          <PMText fontSize="sm">
            {renderDiffText(payload.oldValue, payload.newValue)}
          </PMText>
        </PMHStack>
      </PMAccordion.ItemContent>
    </PMAccordion.Item>
  );
}
