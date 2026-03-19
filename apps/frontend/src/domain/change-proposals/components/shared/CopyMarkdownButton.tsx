import { PMCopiable, PMIconButton, PMTooltip } from '@packmind/ui';
import { LuCopy, LuCheck } from 'react-icons/lu';

interface CopyMarkdownButtonProps {
  markdown: string;
  size?: 'xs' | 'sm';
}

export function CopyMarkdownButton({
  markdown,
  size = 'sm',
}: Readonly<CopyMarkdownButtonProps>) {
  return (
    <PMCopiable.Root value={markdown}>
      <PMTooltip label="Copy markdown">
        <PMCopiable.Trigger asChild>
          <PMIconButton
            aria-label="Copy markdown"
            variant="tertiary"
            size={size}
          >
            <PMCopiable.Indicator copied={<LuCheck />}>
              <LuCopy />
            </PMCopiable.Indicator>
          </PMIconButton>
        </PMCopiable.Trigger>
      </PMTooltip>
    </PMCopiable.Root>
  );
}
