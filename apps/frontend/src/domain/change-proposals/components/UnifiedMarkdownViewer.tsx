import React, { useMemo } from 'react';
import { PMBox, PMMarkdownViewer, PMTooltip } from '@packmind/ui';
import { buildUnifiedMarkdownDiff } from '../utils/buildUnifiedMarkdownDiff';
import { markdownDiffCss } from '../utils/markdownDiff';

interface UnifiedMarkdownViewerProps {
  oldValue: string;
  newValue: string;
  proposalNumbers: number[];
}

/**
 * Renders markdown normally with subtle underlines on changed portions.
 * Shows detailed word-level diff in tooltips on hover.
 */
export function UnifiedMarkdownViewer({
  oldValue,
  newValue,
  proposalNumbers,
}: UnifiedMarkdownViewerProps) {
  const blocks = useMemo(
    () => buildUnifiedMarkdownDiff(oldValue, newValue),
    [oldValue, newValue],
  );

  const proposalText = `Changed by proposal${proposalNumbers.length > 1 ? 's' : ''} #${proposalNumbers.join(', #')}`;

  return (
    <PMBox
      css={{
        '& .changed-block': {
          borderBottom: '2px dotted',
          borderColor: 'var(--chakra-colors-yellow-emphasis)',
          cursor: 'help',
        },
        '& .changed-block > *:first-child': {
          marginTop: 0,
        },
        '& .changed-block > *:last-child': {
          marginBottom: 0,
        },
      }}
    >
      {blocks.map((block, index) => {
        if (!block.isChanged) {
          // Unchanged block - render normally
          return <PMMarkdownViewer key={index} htmlContent={block.html} />;
        }

        // Changed block - render with subtle underline and tooltip
        return (
          <PMTooltip
            key={index}
            label={
              <PMBox maxWidth="500px">
                <PMBox fontSize="xs" fontWeight="semibold" mb={2}>
                  {proposalText}
                </PMBox>
                <PMBox fontSize="xs" css={markdownDiffCss}>
                  <PMMarkdownViewer htmlContent={block.diffHtml || ''} />
                </PMBox>
              </PMBox>
            }
            placement="top"
          >
            <PMBox className="changed-block">
              <PMMarkdownViewer htmlContent={block.html} />
            </PMBox>
          </PMTooltip>
        );
      })}
    </PMBox>
  );
}
