import { useState } from 'react';
import { PMBox, PMButton, PMHStack, PMText } from '@packmind/ui';
import { LuCopy, LuCheck } from 'react-icons/lu';

type StandardPromptProps = {
  description: string;
};

export function StandardPrompt({ description }: StandardPromptProps) {
  const [view, setView] = useState<'preview' | 'raw'>('preview');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PMBox position="relative">
      <PMBox position="absolute" top={2} right={2} zIndex={1}>
        <PMButton
          variant="ghost"
          size="xs"
          onClick={handleCopy}
          color="secondary"
        >
          {copied ? <LuCheck size={14} /> : <LuCopy size={14} />}
        </PMButton>
      </PMBox>

      <PMHStack gap={0} mb={0}>
        <PMButton
          variant={view === 'preview' ? 'solid' : 'ghost'}
          size="xs"
          onClick={() => setView('preview')}
          borderRadius="md md 0 0"
        >
          Preview
        </PMButton>
        <PMButton
          variant={view === 'raw' ? 'solid' : 'ghost'}
          size="xs"
          onClick={() => setView('raw')}
          borderRadius="md md 0 0"
        >
          Raw
        </PMButton>
      </PMHStack>

      <PMBox
        padding={4}
        backgroundColor="background.secondary"
        borderRadius="0 md md md"
      >
        {view === 'preview' ? (
          <PMText fontSize="sm" lineHeight="tall" color="primary">
            {description}
          </PMText>
        ) : (
          <pre
            style={{
              margin: 0,
              fontSize: '13px',
              lineHeight: '1.6',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: '#e2e8f0',
            }}
          >
            {description}
          </pre>
        )}
      </PMBox>
    </PMBox>
  );
}
