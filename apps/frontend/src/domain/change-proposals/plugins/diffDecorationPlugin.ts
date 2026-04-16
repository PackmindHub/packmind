import { Plugin, PluginKey } from '@milkdown/kit/prose/state';
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view';
import { buildUnifiedMarkdownDiff } from '../utils/buildUnifiedMarkdownDiff';
import { mapMarkdownDiffToPositions } from '../utils/mapMarkdownDiffToPositions';
import {
  DiffDecorationPluginOptions,
  DiffPluginState,
  DiffRegion,
} from '../types/diffTypes';
import { createRoot, Root } from 'react-dom/client';
import { PMBox } from '@packmind/ui';
import { Tooltip } from '@chakra-ui/react';
import { markdownDiffCss } from '../utils/markdownDiff';
import React from 'react';

const DIFF_PLUGIN_KEY = new PluginKey<DiffPluginState>('diffDecoration');

/**
 * Creates a tooltip DOM element for a diff region.
 * The tooltip is rendered using React Portal with Chakra UI components.
 */
function createTooltipWidget(
  region: DiffRegion,
  proposalNumbers: number[],
): HTMLElement {
  const tooltipContainer = document.createElement('div');
  tooltipContainer.className = 'milkdown-diff-tooltip';
  tooltipContainer.style.display = 'inline';
  tooltipContainer.style.position = 'relative';

  // Create React root and render tooltip
  const root: Root = createRoot(tooltipContainer);

  const proposalText =
    proposalNumbers.length === 1
      ? `Changed by proposal #${proposalNumbers[0]}`
      : `Changed by proposals ${proposalNumbers.map((n) => `#${n}`).join(', ')}`;

  root.render(
    React.createElement(
      Tooltip.Root,
      { openDelay: 100, closeDelay: 0, positioning: { placement: 'top' } },
      React.createElement(
        Tooltip.Trigger,
        { asChild: true },
        React.createElement('span', {
          style: {
            borderBottom: '2px dotted var(--chakra-colors-yellow-emphasis)',
            cursor: 'help',
          },
        }),
      ),
      React.createElement(
        Tooltip.Content,
        null,
        React.createElement(
          PMBox,
          {
            css: {
              maxWidth: '500px',
              padding: '8px',
            },
          },
          React.createElement(
            PMBox,
            {
              css: {
                fontWeight: 'bold',
                marginBottom: '4px',
                fontSize: '12px',
              },
            },
            proposalText,
          ),
          React.createElement(PMBox, {
            css: {
              fontSize: '14px',
              ...markdownDiffCss,
            },
            dangerouslySetInnerHTML: { __html: region.diffHtml },
          }),
        ),
      ),
    ),
  );

  return tooltipContainer;
}

/**
 * Creates a ProseMirror plugin that adds decorations for diff highlighting and tooltips.
 *
 * @param options - Plugin configuration including old/new values and proposal numbers
 * @returns ProseMirror plugin instance
 */
export function createDiffDecorationPlugin(
  options: DiffDecorationPluginOptions,
): Plugin<DiffPluginState> {
  const { oldValue, newValue, proposalNumbers, doc } = options;

  // Compute diff regions once during initialization
  const blocks = buildUnifiedMarkdownDiff(oldValue, newValue);
  const diffRegions = mapMarkdownDiffToPositions(blocks, newValue, doc);

  return new Plugin<DiffPluginState>({
    key: DIFF_PLUGIN_KEY,

    state: {
      init: (): DiffPluginState => ({
        diffRegions,
        hoveredRegion: null,
      }),

      apply: (tr, state): DiffPluginState => {
        // State remains constant (diffs don't change after initialization)
        return state;
      },
    },

    props: {
      decorations: (state): DecorationSet => {
        const pluginState = DIFF_PLUGIN_KEY.getState(state);
        if (!pluginState) return DecorationSet.empty;

        const decorations: Decoration[] = [];

        // Create inline decorations for each diff region
        for (const region of pluginState.diffRegions) {
          // Add highlight decoration
          decorations.push(
            Decoration.inline(region.from, region.to, {
              class: 'milkdown-diff-highlight',
              'data-diff-from': String(region.from),
              'data-diff-to': String(region.to),
            }),
          );
        }

        return DecorationSet.create(state.doc, decorations);
      },

      handleDOMEvents: {
        mouseover: (view, event) => {
          const target = event.target as HTMLElement;

          // Check if we're hovering over a diff highlight
          const diffElement = target.closest('.milkdown-diff-highlight');
          if (!diffElement) return false;

          const from = parseInt(
            diffElement.getAttribute('data-diff-from') || '0',
            10,
          );
          const to = parseInt(
            diffElement.getAttribute('data-diff-to') || '0',
            10,
          );

          const pluginState = DIFF_PLUGIN_KEY.getState(view.state);
          if (!pluginState) return false;

          // Find the matching region
          const region = pluginState.diffRegions.find(
            (r) => r.from === from && r.to === to,
          );

          if (region && region !== pluginState.hoveredRegion) {
            // Show tooltip for this region
            const tooltipWidget = createTooltipWidget(region, proposalNumbers);

            // Append tooltip to diff element
            if (!diffElement.querySelector('.milkdown-diff-tooltip')) {
              diffElement.appendChild(tooltipWidget);
            }
          }

          return false;
        },

        mouseout: (view, event) => {
          const target = event.target as HTMLElement;
          const diffElement = target.closest('.milkdown-diff-highlight');

          if (diffElement) {
            // Remove tooltip
            const tooltip = diffElement.querySelector('.milkdown-diff-tooltip');
            if (tooltip) {
              tooltip.remove();
            }
          }

          return false;
        },
      },
    },
  });
}
