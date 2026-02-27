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
        mode: 'diff',
      });
    }
    if (displayMode === 'unified') {
      // For unified mode, rebuild with markers for changed code blocks
      return rebuildMarkdownFromBlocks(blocks, {
        includeDeleted: false,
        useDiffContent: false,
        mode: 'unified',
      });
    }
    // For 'plain' mode, use clean newValue
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
        // Convert ++ and -- markers to HTML tags
        const convertedDiffHtml = diffHtml
          .replace(/\+\+([^+]+)\+\+/g, '<ins>$1</ins>')
          .replace(/--([^-]+)--/g, '<del>$1</del>');
        content.innerHTML = convertedDiffHtml;
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

  // Add special handling for code diff triggers in unified mode
  useEffect(() => {
    if (displayMode !== 'unified') return;
    if (!isEditorReady || !editorRef.current) return;

    const handleCodeDiffMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if it's a link with #CODE_DIFF: href
      if (target.tagName === 'A') {
        const href = target.getAttribute('href') || '';
        if (href.startsWith('#CODE_DIFF:')) {
          const encodedDiff = href.substring('#CODE_DIFF:'.length);
          let lineDiff = '';

          try {
            lineDiff =
              typeof atob !== 'undefined'
                ? atob(encodedDiff)
                : Buffer.from(encodedDiff, 'base64').toString('utf-8');
          } catch (error) {
            console.error('Failed to decode line diff:', error);
            return;
          }

          // Create tooltip element
          const tooltip = document.createElement('div');
          tooltip.className = 'code-diff-tooltip';
          tooltip.style.cssText = `
          position: fixed;
          z-index: 10000;
          background: #1f2937;
          color: #f9fafb;
          padding: 12px;
          border-radius: 6px;
          max-width: 600px;
          font-size: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          pointer-events: none;
          font-family: monospace;
          white-space: pre;
          overflow-x: auto;
        `;

          const header = document.createElement('div');
          header.style.cssText =
            'font-weight: bold; margin-bottom: 8px; font-family: sans-serif;';
          header.textContent = 'Code changes';

          const content = document.createElement('div');
          content.style.cssText = 'font-size: 13px;';

          // Format diff lines with colors
          const lines = lineDiff.split('\n');
          const formattedLines = lines
            .map((line) => {
              if (line.startsWith('+')) {
                return `<span style="color: #86efac; background-color: rgba(34, 197, 94, 0.2);">${escapeHtmlInComponent(line)}</span>`;
              } else if (line.startsWith('-')) {
                return `<span style="color: #fca5a5; background-color: rgba(239, 68, 68, 0.2);">${escapeHtmlInComponent(line)}</span>`;
              } else {
                return `<span style="color: #d1d5db;">${escapeHtmlInComponent(line)}</span>`;
              }
            })
            .join('\n');

          content.innerHTML = formattedLines;

          tooltip.appendChild(header);
          tooltip.appendChild(content);

          document.body.appendChild(tooltip);
          target.setAttribute('data-code-tooltip-id', 'active');

          // Position tooltip after append
          requestAnimationFrame(() => {
            const rect = target.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();

            // Position above the element
            let top = rect.top - tooltipRect.height - 8;
            let left = rect.left + rect.width / 2 - tooltipRect.width / 2;

            // Keep tooltip within viewport
            if (top < 0) {
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
      }
    };

    const handleCodeDiffMouseLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.getAttribute('data-code-tooltip-id') === 'active') {
        target.removeAttribute('data-code-tooltip-id');
        document
          .querySelectorAll('.code-diff-tooltip')
          .forEach((el) => el.remove());
      }
    };

    // Helper function to escape HTML in component
    const escapeHtmlInComponent = (text: string): string => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    // Apply styling to code diff links
    const applyCodeDiffStyling = () => {
      const proseMirrorEditor =
        editorRef.current?.querySelector('.ProseMirror');
      if (!proseMirrorEditor) return;

      const links = proseMirrorEditor.querySelectorAll(
        'a[href^="#CODE_DIFF:"]',
      );
      links.forEach((link) => {
        const element = link as HTMLElement;
        // The link will already have styling from the <ins> wrapper
        // Just ensure it's clickable and has cursor pointer
        element.style.cursor = 'pointer';
        element.style.textDecoration = 'none';
        // Prevent default link behavior
        element.addEventListener('click', (e) => {
          e.preventDefault();
        });
      });
    };

    // Wait for content to render
    const timer = setTimeout(() => {
      applyCodeDiffStyling();
    }, 500);

    const editor = editorRef.current;
    if (!editor) {
      return () => {
        clearTimeout(timer);
      };
    }

    editor.addEventListener('mouseover', handleCodeDiffMouseEnter);
    editor.addEventListener('mouseout', handleCodeDiffMouseLeave);

    return () => {
      clearTimeout(timer);
      editor.removeEventListener('mouseover', handleCodeDiffMouseEnter);
      editor.removeEventListener('mouseout', handleCodeDiffMouseLeave);
      document
        .querySelectorAll('.code-diff-tooltip')
        .forEach((el) => el.remove());
    };
  }, [isEditorReady, displayMode]);

  // Convert ++ and -- markers to HTML tags in diff mode
  useEffect(() => {
    if (displayMode !== 'diff') return;
    if (!isEditorReady || !editorRef.current) return;

    const convertMarkersToHtml = () => {
      const proseMirrorEditor =
        editorRef.current?.querySelector('.ProseMirror');
      if (!proseMirrorEditor) return;

      // Get all text nodes
      const walker = document.createTreeWalker(
        proseMirrorEditor,
        NodeFilter.SHOW_TEXT,
        null,
      );

      const nodesToProcess: { node: Text; newContent: string }[] = [];

      let node: Node | null;
      while ((node = walker.nextNode())) {
        const textNode = node as Text;
        const text = textNode.textContent || '';

        // Check if the text contains our markers
        if (text.includes('++') || text.includes('--')) {
          // Replace ++text++ with <ins>text</ins> and --text-- with <del>text</del>
          const newContent = text
            .replace(/\+\+([^+]+)\+\+/g, '<ins>$1</ins>')
            .replace(/--([^-]+)--/g, '<del>$1</del>');

          if (newContent !== text) {
            nodesToProcess.push({ node: textNode, newContent });
          }
        }
      }

      // Process all nodes that need updating
      nodesToProcess.forEach(({ node, newContent }) => {
        const parent = node.parentElement;
        if (parent) {
          // Create a temporary container to parse the HTML
          const temp = document.createElement('span');
          temp.innerHTML = newContent;

          // Replace the text node with the parsed HTML nodes
          const fragment = document.createDocumentFragment();
          while (temp.firstChild) {
            fragment.appendChild(temp.firstChild);
          }

          parent.replaceChild(fragment, node);
        }
      });
    };

    // Wait for content to render, then convert markers
    const timer = setTimeout(() => {
      convertMarkersToHtml();
    }, 600);

    // Set up observer to handle dynamic content changes
    const proseMirrorEditor = editorRef.current.querySelector('.ProseMirror');
    if (proseMirrorEditor) {
      const observer = new MutationObserver(() => {
        convertMarkersToHtml();
      });

      observer.observe(proseMirrorEditor, {
        childList: true,
        subtree: true,
      });

      return () => {
        clearTimeout(timer);
        observer.disconnect();
      };
    }

    return () => {
      clearTimeout(timer);
    };
  }, [isEditorReady, displayMode]);

  // For all modes, use Milkdown to render markdown
  return (
    <PMBox data-milkdown-padding-variant={paddingVariant} css={markdownDiffCss}>
      <Milkdown />
    </PMBox>
  );
};
