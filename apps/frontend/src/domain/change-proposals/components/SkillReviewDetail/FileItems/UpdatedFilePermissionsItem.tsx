import { PMAccordion, PMHStack, PMText } from '@packmind/ui';
import {
  CollectionItemUpdatePayload,
  SkillFile,
  SkillFileId,
} from '@packmind/types';
import { FileContent } from './FileContent';

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
      <PMAccordion.ItemTrigger
        cursor="pointer"
        bg="background.primary"
        px={2}
        data-diff-change
      >
        <PMAccordion.ItemIndicator />
        <PMHStack justify="space-between" width="full">
          <PMText fontSize="sm" fontWeight="semibold">
            {file.path}
          </PMText>
          <PMHStack gap={2} align="center">
            <PMText
              fontSize="xs"
              fontFamily="mono"
              bg="red.subtle"
              paddingX={1}
              borderRadius="sm"
              textDecoration="line-through"
            >
              {payload.oldValue}
            </PMText>
            <PMText fontSize="xs" color="faded">
              →
            </PMText>
            <PMText
              fontSize="xs"
              fontFamily="mono"
              bg="green.subtle"
              paddingX={1}
              borderRadius="sm"
            >
              {payload.newValue}
            </PMText>
          </PMHStack>
        </PMHStack>
      </PMAccordion.ItemTrigger>
      <PMAccordion.ItemContent>
        <FileContent file={file} />
      </PMAccordion.ItemContent>
    </PMAccordion.Item>
  );
}
