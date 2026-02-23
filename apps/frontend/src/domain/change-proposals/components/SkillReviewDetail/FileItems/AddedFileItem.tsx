import { PMAccordion, PMBadge, PMHStack, PMText } from '@packmind/ui';
import { CollectionItemAddPayload, SkillFile } from '@packmind/types';
import { FileContent } from './FileContent';

export function AddedFileItem({
  payload,
}: {
  payload: CollectionItemAddPayload<Omit<SkillFile, 'skillVersionId'>>;
}) {
  const newFile = payload.item;
  return (
    <PMAccordion.Item
      key={newFile.id}
      value={newFile.id}
      borderRadius="md"
      border="1px solid"
      borderColor="green.500"
      bg="green.subtle"
    >
      <PMAccordion.ItemTrigger
        cursor="pointer"
        bg="background.primary"
        px={2}
        data-diff-change
      >
        <PMAccordion.ItemIndicator />
        <PMHStack justify="space-between" width="full">
          <PMText fontSize="sm" fontWeight="semibold">
            {newFile.path}
          </PMText>
          <PMBadge colorPalette="green" size="sm">
            New
          </PMBadge>
        </PMHStack>
      </PMAccordion.ItemTrigger>
      <PMAccordion.ItemContent>
        <FileContent file={newFile} />
      </PMAccordion.ItemContent>
    </PMAccordion.Item>
  );
}
