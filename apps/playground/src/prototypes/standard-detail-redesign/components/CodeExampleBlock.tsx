import { PMBox, PMText, PMVStack } from '@packmind/ui';
import { LuCheck, LuX } from 'react-icons/lu';
import { CodeExample } from '../types';

type CodeExampleBlockProps = {
  example: CodeExample;
};

function CodeBlock({
  code,
  variant,
}: {
  code: string;
  variant: 'positive' | 'negative';
}) {
  const isPositive = variant === 'positive';

  return (
    <PMVStack gap={1} align="stretch">
      <PMBox
        display="flex"
        alignItems="center"
        gap={1}
        color={isPositive ? 'green.400' : 'red.400'}
      >
        {isPositive ? <LuCheck size={14} /> : <LuX size={14} />}
        <PMText fontSize="xs" fontWeight="semibold">
          {isPositive ? 'Do' : "Don't"}
        </PMText>
      </PMBox>
      <PMBox
        backgroundColor={isPositive ? 'green.950' : 'red.950'}
        borderRadius="md"
        padding={3}
        overflow="auto"
        borderLeft="3px solid"
        borderColor={isPositive ? 'green.700' : 'red.700'}
      >
        <pre
          style={{
            margin: 0,
            fontSize: '12px',
            lineHeight: '1.5',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            color: '#e2e8f0',
          }}
        >
          {code}
        </pre>
      </PMBox>
    </PMVStack>
  );
}

export function CodeExampleBlock({ example }: CodeExampleBlockProps) {
  return (
    <PMVStack gap={3} align="stretch">
      <CodeBlock code={example.positive} variant="positive" />
      <CodeBlock code={example.negative} variant="negative" />
    </PMVStack>
  );
}
