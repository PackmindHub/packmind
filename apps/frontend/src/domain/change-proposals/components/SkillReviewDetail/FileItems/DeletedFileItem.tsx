import { PMAccordion, PMText } from '@packmind/ui';
import { SkillFile } from '@packmind/types';

export function DeletedFileItem({ file }: { file: SkillFile }) {
  return (
    <PMAccordion.Item
      key={file.id}
      value={file.id}
      borderRadius="md"
      border="1px solid"
      borderColor="red.500"
      bg="red.subtle"
      opacity={0.7}
    >
      <PMAccordion.ItemTrigger cursor="pointer" bg="background.primary" px={2}>
        <PMAccordion.ItemIndicator />
        <PMText
          fontSize="sm"
          fontWeight="semibold"
          textDecoration="line-through"
        >
          {file.path}
        </PMText>
      </PMAccordion.ItemTrigger>
    </PMAccordion.Item>
  );
}
