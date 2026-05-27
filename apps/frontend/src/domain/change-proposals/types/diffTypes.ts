import { Node as ProseMirrorNode } from '@milkdown/kit/prose/model';

/**
 * Represents a region of text in the ProseMirror document that has changed.
 * Used by the diff decoration plugin to highlight changes and show tooltips.
 */
export interface DiffRegion {
  /** Start position in the ProseMirror document */
  from: number;
  /** End position in the ProseMirror document */
  to: number;
  /** HTML content showing the diff (with <ins> and <del> tags) */
  diffHtml: string;
  /** Original text content before the change */
  oldValue: string;
  /** New text content after the change */
  newValue: string;
}

/**
 * Options passed to the diff decoration plugin.
 */
export interface DiffDecorationPluginOptions {
  /** Original markdown content before changes */
  oldValue: string;
  /** New markdown content after changes */
  newValue: string;
  /** Array of proposal numbers that made changes (for tooltip header) */
  proposalNumbers: number[];
  /** ProseMirror document node (provided by the editor instance) */
  doc: ProseMirrorNode;
}

/**
 * Internal state maintained by the diff decoration plugin.
 */
export interface DiffPluginState {
  /** Computed diff regions (calculated once during plugin initialization) */
  diffRegions: DiffRegion[];
  /** Currently hovered diff region (for tooltip display) */
  hoveredRegion: DiffRegion | null;
}
