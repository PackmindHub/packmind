import { Crepe } from '@milkdown/crepe';
import { Milkdown, useEditor } from '@milkdown/react';
import '@packmind/assets/milkdown.theme';
import { PMBox } from '@packmind/ui';
import React, { useEffect, useRef, useMemo, useState } from 'react';
import { parseAndDiffMarkdown } from '../../../domain/change-proposals/utils/markdownBlockDiff';
import { rebuildMarkdownFromBlocks } from '../../../domain/change-proposals/utils/rebuildMarkdownFromBlocks';
import { markdownDiffCss } from '../../../domain/change-proposals/utils/markdownDiff';

export interface IDiffMarkdownEditorProps {
  /** Original markdown content before changes */
  oldValue: string;
  /** New markdown content after changes */
  newValue: string;
  /** Array of proposal numbers that made changes */
  proposalNumbers: number[];
  /** Padding variant for the editor */
  paddingVariant?: 'default' | 'none';
  /** Display mode: 'unified' (highlights with tooltips), 'diff' (inline +/-), 'plain' (clean view) */
  displayMode: 'unified' | 'diff' | 'plain';
}

/**
 * A specialized MarkdownEditor that supports three display modes:
 * - 'unified': Displays the new content with highlights and tooltips showing what changed
 * - 'diff': Displays inline diff with additions and deletions using HTML rendering
 * - 'plain': Displays the new content without any diff highlighting (clean view)
 *
 * This component is read-only and designed for viewing change proposals.
 */
export const DiffMarkdownEditor: React.FC<IDiffMarkdownEditorProps> = ({
  oldValue,
  newValue,
  proposalNumbers,
  displayMode,
  paddingVariant = 'default',
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  // Parse and diff markdown blocks
  const blocks = useMemo(
    () => parseAndDiffMarkdown(oldValue, newValue),
    [oldValue, newValue],
  );

  // Compute editor content based on display mode
  const editorContent = useMemo(() => {
    if (displayMode === 'diff') {
      // For diff mode, rebuild with HTML and include deleted blocks
      return rebuildMarkdownFromBlocks(blocks, {
        includeDeleted: true,
        useDiffContent: true,
      });
    }
    // For 'unified' and 'plain' modes, use clean newValue
    return newValue;
  }, [displayMode, blocks, newValue]);

  useEditor((root) => {
    editorRef.current = root as HTMLDivElement;

    const crepe = new Crepe({
      root,
      defaultValue: editorContent,
      features: {
        [Crepe.Feature.ImageBlock]: false,
        [Crepe.Feature.Latex]: false,
        [Crepe.Feature.Toolbar]: false,
        [Crepe.Feature.LinkTooltip]: false,
      },
    });

    crepe.setReadonly(true);

    // Mark editor as ready to trigger highlight effect
    setIsEditorReady(true);

    return crepe;
  });

  // Apply highlights to changed content after editor renders (unified mode only)
  useEffect(() => {
    // Helper function to remove all highlights
    const removeHighlights = () => {
      if (!editorRef.current) return;
      const proseMirrorEditor = editorRef.current.querySelector('.ProseMirror');
      if (!proseMirrorEditor) return;

      const highlightedElements = proseMirrorEditor.querySelectorAll(
        '.milkdown-diff-highlight',
      );
      highlightedElements.forEach((element) => {
        (element as HTMLElement).classList.remove('milkdown-diff-highlight');
        (element as HTMLElement).removeAttribute('data-diff-html');
        (element as HTMLElement).removeAttribute('data-proposal-numbers');
      });
    };

    // If not in unified mode, remove any existing highlights and return
    if (displayMode !== 'unified') {
      removeHighlights();
      return;
    }

    if (!isEditorReady || !editorRef.current || blocks.length === 0) return;

    // Collect all changed blocks and list items for highlighting
    interface HighlightTarget {
      content: string;
      diffContent: string;
    }

    const highlightTargets: HighlightTarget[] = [];

    for (const block of blocks) {
      // Add changed blocks (non-list blocks)
      if (
        block.status !== 'unchanged' &&
        block.diffContent &&
        block.type !== 'list'
      ) {
        highlightTargets.push({
          content: block.content,
          diffContent: block.diffContent,
        });
      }

      // Add changed list items
      if (block.type === 'list' && block.items) {
        for (const item of block.items) {
          if (item.status !== 'unchanged' && item.diffContent) {
            highlightTargets.push({
              content: item.content,
              diffContent: item.diffContent,
            });
          }
        }
      }
    }

    if (highlightTargets.length === 0) return;

    const applyHighlights = () => {
      const proseMirrorEditor =
        editorRef.current?.querySelector('.ProseMirror');
      if (!proseMirrorEditor) return;

      // Get all text-containing elements
      const contentElements = proseMirrorEditor.querySelectorAll(
        'p, h1, h2, h3, h4, h5, h6, li, code',
      );

      if (contentElements.length === 0) return;

      contentElements.forEach((element) => {
        // Skip if already highlighted
        if (
          (element as HTMLElement).classList.contains('milkdown-diff-highlight')
        ) {
          return;
        }

        const elementText = element.textContent?.trim() || '';
        if (!elementText) return;

        // Check if this element's text matches any changed block or list item
        for (const target of highlightTargets) {
          const normalizedElementText = elementText.replace(/\s+/g, ' ').trim();
          const normalizedTargetText = target.content
            .replace(/\s+/g, ' ')
            .trim();

          // Match if texts are similar (handle minor whitespace differences)
          if (
            normalizedElementText === normalizedTargetText ||
            normalizedElementText.includes(normalizedTargetText) ||
            normalizedTargetText.includes(normalizedElementText)
          ) {
            (element as HTMLElement).classList.add('milkdown-diff-highlight');
            (element as HTMLElement).setAttribute(
              'data-diff-html',
              target.diffContent || '',
            );
            (element as HTMLElement).setAttribute(
              'data-proposal-numbers',
              proposalNumbers.join(','),
            );
            break;
          }
        }
      });
    };

    // Use MutationObserver to watch for when content is added
    const proseMirrorEditor = editorRef.current.querySelector('.ProseMirror');

    if (proseMirrorEditor) {
      // Apply immediately if content already exists
      const initialCheck = setTimeout(() => {
        applyHighlights();
      }, 500); // Give editor time to render

      // Set up observer for dynamic content changes
      const observer = new MutationObserver((mutations) => {
        // Check if any text nodes were added
        const hasTextChanges = mutations.some(
          (mutation) =>
            mutation.addedNodes.length > 0 || mutation.type === 'characterData',
        );

        if (hasTextChanges) {
          applyHighlights();
        }
      });

      observer.observe(proseMirrorEditor, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      return () => {
        clearTimeout(initialCheck);
        observer.disconnect();
        removeHighlights();
      };
    } else {
      // ProseMirror element not found yet - wait for it to be added
      const waitForProseMirror = new MutationObserver(() => {
        const pm = editorRef.current?.querySelector('.ProseMirror');
        if (pm) {
          waitForProseMirror.disconnect();

          // Wait a bit for content to render, then apply highlights
          setTimeout(() => {
            applyHighlights();
          }, 500);
        }
      });

      waitForProseMirror.observe(editorRef.current, {
        childList: true,
        subtree: true,
      });

      return () => {
        waitForProseMirror.disconnect();
        removeHighlights();
      };
    }
  }, [blocks, proposalNumbers, isEditorReady, displayMode]);

  // Add hover handlers for tooltips (unified mode only)
  useEffect(() => {
    if (displayMode !== 'unified') return; // Skip for diff and plain modes
    if (!isEditorReady || !editorRef.current) return;

    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('milkdown-diff-highlight')) {
        const diffHtml = target.getAttribute('data-diff-html') || '';
        const proposalNumbersStr =
          target.getAttribute('data-proposal-numbers') || '';
        const numbers = proposalNumbersStr.split(',').map(Number);

        const proposalText = `Changed by proposal${numbers.length > 1 ? 's' : ''} #${numbers.join(', #')}`;

        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'diff-tooltip';
        tooltip.style.cssText = `
          position: fixed;
          z-index: 10000;
          background: #1f2937;
          color: #f9fafb;
          padding: 12px;
          border-radius: 6px;
          max-width: 500px;
          font-size: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          pointer-events: none;
        `;

        const header = document.createElement('div');
        header.style.cssText = 'font-weight: bold; margin-bottom: 4px;';
        header.textContent = proposalText;

        const content = document.createElement('div');
        content.innerHTML = diffHtml;
        content.style.cssText = 'font-size: 14px;';

        // Apply diff styling
        content.querySelectorAll('ins, .diff-ins').forEach((el) => {
          (el as HTMLElement).style.cssText =
            'background-color: rgba(34, 197, 94, 0.2); padding: 0 2px; border-radius: 2px; text-decoration: none; color: #86efac;';
        });
        content.querySelectorAll('del, .diff-del').forEach((el) => {
          (el as HTMLElement).style.cssText =
            'background-color: rgba(239, 68, 68, 0.2); padding: 0 2px; border-radius: 2px; color: #fca5a5;';
        });

        tooltip.appendChild(header);
        tooltip.appendChild(content);

        document.body.appendChild(tooltip);
        target.setAttribute('data-tooltip-id', 'active');

        // Position tooltip after append (to get actual dimensions)
        requestAnimationFrame(() => {
          const rect = target.getBoundingClientRect();
          const tooltipRect = tooltip.getBoundingClientRect();

          // Position above the element
          let top = rect.top - tooltipRect.height - 8;
          let left = rect.left + rect.width / 2 - tooltipRect.width / 2;

          // Keep tooltip within viewport
          if (top < 0) {
            // If no space above, show below
            top = rect.bottom + 8;
          }
          if (left < 8) {
            left = 8;
          }
          if (left + tooltipRect.width > window.innerWidth - 8) {
            left = window.innerWidth - tooltipRect.width - 8;
          }

          tooltip.style.top = `${top}px`;
          tooltip.style.left = `${left}px`;
        });
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.getAttribute('data-tooltip-id') === 'active') {
        target.removeAttribute('data-tooltip-id');
        document.querySelectorAll('.diff-tooltip').forEach((el) => el.remove());
      }
    };

    const editor = editorRef.current;
    editor.addEventListener('mouseover', handleMouseEnter);
    editor.addEventListener('mouseout', handleMouseLeave);

    return () => {
      editor.removeEventListener('mouseover', handleMouseEnter);
      editor.removeEventListener('mouseout', handleMouseLeave);
      document.querySelectorAll('.diff-tooltip').forEach((el) => el.remove());
    };
  }, [isEditorReady, displayMode, proposalNumbers]);

  // For diff mode, render HTML directly without Milkdown
  if (displayMode === 'diff') {
    return (
      <PMBox
        data-milkdown-padding-variant={paddingVariant}
        css={markdownDiffCss}
        dangerouslySetInnerHTML={{ __html: editorContent }}
        style={{
          padding: paddingVariant === 'default' ? '16px' : '0',
          minHeight: '100px',
        }}
      />
    );
  }

  // For unified and plain modes, use Milkdown with highlights (unified) or without (plain)
  return (
    <PMBox data-milkdown-padding-variant={paddingVariant}>
      <Milkdown />
    </PMBox>
  );
};
