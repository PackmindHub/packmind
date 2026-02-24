import {
  PMAccordion,
  PMBadge,
  PMBox,
  PMHStack,
  PMText,
  PMTooltip,
} from '@packmind/ui';
import { SkillFile } from '@packmind/types';
import { FileContent } from './FileContent';

type FileAccordionItemProps = {
  file: Pick<SkillFile, 'path' | 'content' | 'permissions' | 'isBase64'>;
  variant?: 'default' | 'added' | 'deleted';
  accordionValue: string;
};

const borderColorByVariant = {
  default: 'border.primary',
  added: 'green.500',
  deleted: 'red.500',
} as const;

export function FileAccordionItem({
  file,
  variant = 'default',
  accordionValue,
}: FileAccordionItemProps) {
  const hasDiffChange = variant === 'added' || variant === 'deleted';

  return (
    <PMAccordion.Item
      key={accordionValue}
      value={accordionValue}
      borderRadius="md"
      border="1px solid"
      borderColor={borderColorByVariant[variant]}
    >
      <PMAccordion.ItemTrigger
        cursor="pointer"
        bg="background.primary"
        px={2}
        {...(hasDiffChange && { 'data-diff-change': true })}
      >
        <PMAccordion.ItemIndicator />
        <PMHStack gap={2} flex={1} minWidth={0}>
          <PMBox minWidth={0} truncate>
            <PMTooltip label={file.path}>
              <PMText
                fontSize="sm"
                fontWeight="semibold"
                {...(variant === 'deleted' && {
                  textDecoration: 'line-through',
                })}
              >
                {file.path}
              </PMText>
            </PMTooltip>
          </PMBox>
          {variant === 'added' && (
            <PMBadge colorPalette="green" size="sm" flexShrink={0}>
              New
            </PMBadge>
          )}
          {variant !== 'deleted' && (
            <PMText
              fontSize="xs"
              color="secondary"
              marginLeft="auto"
              flexShrink={0}
            >
              {file.permissions}
            </PMText>
          )}
        </PMHStack>
      </PMAccordion.ItemTrigger>
      <PMAccordion.ItemContent>
        <FileContent file={file} />
      </PMAccordion.ItemContent>
    </PMAccordion.Item>
  );
}
