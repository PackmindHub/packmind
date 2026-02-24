import React from 'react';
import { PMBox } from '@packmind/ui';
import { MilkdownProvider } from '@milkdown/react';
import { DiffMarkdownEditor } from '../../../shared/components/editor/DiffMarkdownEditor';

interface UnifiedMarkdownViewerProps {
  oldValue: string;
  newValue: string;
  proposalNumbers: number[];
}

/**
 * Renders markdown with diff highlighting using a single Milkdown editor.
 * Changed text regions are highlighted with yellow dotted underlines.
 * Hovering over highlights shows detailed word-level diffs in tooltips.
 */
export function UnifiedMarkdownViewer({
  oldValue,
  newValue,
  proposalNumbers,
}: UnifiedMarkdownViewerProps) {
  return (
    <PMBox data-diff-section>
      <MilkdownProvider>
        <DiffMarkdownEditor
          oldValue={oldValue}
          newValue={newValue}
          proposalNumbers={proposalNumbers}
          paddingVariant="none"
        />
      </MilkdownProvider>
    </PMBox>
  );
}
