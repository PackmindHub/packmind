import { PMAccordion, PMText } from '@packmind/ui';
import { SkillFile } from '@packmind/types';
import { FileContent } from './FileContent';

export function DeletedFileItem({ file }: { file: SkillFile }) {
  return (
    <PMAccordion.Item
      key={file.id}
      value={file.id}
      borderRadius="md"
      border="1px solid"
      borderColor="red.500"
    >
      <PMAccordion.ItemTrigger
        cursor="pointer"
        bg="background.primary"
        px={2}
        data-diff-change
      >
        <PMAccordion.ItemIndicator />
        <PMText
          fontSize="sm"
          fontWeight="semibold"
          textDecoration="line-through"
        >
          {file.path}
        </PMText>
      </PMAccordion.ItemTrigger>
      <PMAccordion.ItemContent>
        <FileContent file={file} />
      </PMAccordion.ItemContent>
    </PMAccordion.Item>
  );
}
