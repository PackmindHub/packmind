import {
  PMBox,
  PMCodeMirror,
  PMHStack,
  PMMarkdownViewer,
  PMText,
} from '@packmind/ui';
import { getFileLanguage } from '../../../skills/utils/fileTreeUtils';

interface DiffBlockProps {
  value: string;
  variant: 'removed' | 'added';
  isMarkdown: boolean;
  showIndicator?: boolean;
  filePath?: string;
}

const variantConfig = {
  removed: {
    indicator: '\u2212',
    indicatorColor: 'error' as const,
    bg: 'red.500/10',
    borderColor: 'red.500/30',
  },
  added: {
    indicator: '+',
    indicatorColor: 'success' as const,
    bg: 'green.500/10',
    borderColor: 'green.500/30',
  },
};

export function DiffBlock({
  value,
  variant,
  isMarkdown,
  showIndicator = true,
  filePath,
}: Readonly<DiffBlockProps>) {
  const config = variantConfig[variant];

  return (
    <PMHStack gap={2} alignItems="stretch">
      {showIndicator && (
        <PMText
          fontWeight="bold"
          fontSize="sm"
          color={config.indicatorColor}
          fontFamily="mono"
          pt={2}
          flexShrink={0}
        >
          {config.indicator}
        </PMText>
      )}
      <PMBox
        flex={1}
        bg={config.bg}
        borderLeft="2px solid"
        borderColor={config.borderColor}
        borderRadius="md"
        p={3}
      >
        {isMarkdown ? (
          <PMMarkdownViewer content={value} />
        ) : filePath ? (
          <PMCodeMirror
            value={value}
            language={getFileLanguage(filePath)}
            readOnly
          />
        ) : (
          <PMText fontSize="sm">{value}</PMText>
        )}
      </PMBox>
    </PMHStack>
  );
}
