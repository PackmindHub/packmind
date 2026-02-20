import { PMAccordion, PMHStack, PMText } from '@packmind/ui';
import { SkillFile } from '@packmind/types';
import { FileContent } from './FileContent';

export function FileAccordionItem({ file }: { file: SkillFile }) {
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
        <PMHStack justify="space-between" width="full">
          <PMText fontSize="sm" fontWeight="semibold">
            {file.path}
          </PMText>
          <PMText fontSize="xs" color="secondary">
            {file.permissions}
          </PMText>
        </PMHStack>
      </PMAccordion.ItemTrigger>
      <PMAccordion.ItemContent>
        <FileContent file={file} />
      </PMAccordion.ItemContent>
    </PMAccordion.Item>
  );
}
