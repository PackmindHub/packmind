import { PMBox, PMHStack, PMMarkdownViewer, PMText } from '@packmind/ui';

interface DiffBlockProps {
  value: string;
  variant: 'removed' | 'added';
  isMarkdown: boolean;
}

const variantConfig = {
  removed: {
    indicator: '\u2212',
    indicatorColor: 'error' as const,
    bg: 'red.subtle',
    borderColor: 'red.200',
  },
  added: {
    indicator: '+',
    indicatorColor: 'success' as const,
    bg: 'green.subtle',
    borderColor: 'green.200',
  },
};

export function DiffBlock({
  value,
  variant,
  isMarkdown,
}: Readonly<DiffBlockProps>) {
  const config = variantConfig[variant];

  return (
    <PMHStack
      gap={0}
      alignItems="stretch"
      borderRadius="md"
      overflow="hidden"
      border="1px solid"
      borderColor={config.borderColor}
    >
      <PMBox
        width="28px"
        flexShrink={0}
        bg={config.bg}
        display="flex"
        alignItems="flex-start"
        justifyContent="center"
        pt={2}
      >
        <PMText
          fontWeight="bold"
          fontSize="sm"
          color={config.indicatorColor}
          fontFamily="mono"
        >
          {config.indicator}
        </PMText>
      </PMBox>
      <PMBox flex={1} bg={config.bg} p={3}>
        {isMarkdown ? (
          <PMMarkdownViewer content={value} />
        ) : (
          <PMText fontSize="sm">{value}</PMText>
        )}
      </PMBox>
    </PMHStack>
  );
}
