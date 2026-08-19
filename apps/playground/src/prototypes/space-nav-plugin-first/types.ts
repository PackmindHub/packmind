import type { ReactNode } from 'react';

/**
 * The five body kinds needed to cover every current and anticipated component
 * type. The component detail is a frame with an interchangeable body, not a
 * markdown editor with variations.
 */
export type ComponentBodyKind =
  | 'prose'
  | 'prose+rules'
  | 'prose+frontmatter'
  | 'prose+frontmatter+files'
  | 'config-form';

/**
 * One row per component type. This table is the whole point of the redesign:
 * navigation, the creation menu, the grouping inside a plugin and what a
 * marketplace can carry are all derived from it. Adding a type means adding
 * a row, never adding a navigation entry.
 */
export type ComponentTypeDescriptor = {
  type: string;
  labelSingular: string;
  labelPlural: string;
  icon: ReactNode;
  body: ComponentBodyKind;
  agents: string[];
  marketplaceRenderable: boolean;
  status: 'live' | 'planned';
};

export type ComponentRule = {
  id: string;
  text: string;
  detection: 'automated' | 'manual';
};

export type ComponentFile = {
  path: string;
  size: string;
  executable?: boolean;
  binary?: boolean;
  content?: string;
};

export type ComponentField = {
  label: string;
  value: string;
  kind?: 'text' | 'code' | 'choice';
  hint?: string;
};

export type Component = {
  id: string;
  name: string;
  type: string;
  version: number;
  /**
   * The component's only status. Distribution is a property of the plugin, not
   * of what it contains, so nothing about repositories or plugins appears here.
   */
  pendingReview?: boolean;
  updatedLabel: string;
  author: string;
  summary: string;
  prose?: string;
  rules?: ComponentRule[];
  frontmatter?: ComponentField[];
  files?: ComponentFile[];
  config?: ComponentField[];
};

/**
 * The three ways a plugin reaches a consumer. The marketplace is a third mode
 * rather than a separate kind of object: publishing a plugin answers the same
 * question as pushing to a repository, "where does this plugin live", so it
 * belongs in the same list.
 */
export type DistributionMode = 'git-push' | 'cli-install' | 'marketplace';

export type DistributionState = 'aligned' | 'drift' | 'failed';

export type DistributionTarget = {
  id: string;
  mode: DistributionMode;
  /** `owner/repo` for the two git modes, the marketplace name for the third. */
  name: string;
  branch?: string;
  /** Sub-directory, carried only when it is not the repository root. */
  directory?: string;
  /** Marketplace only. */
  slug?: string;
  /** Marketplace only: the version of the published plugin. */
  version?: string;
  state: DistributionState;
  /** What happened on the last attempt, in the user's words. */
  lastEvent: string;
  /** Names of the components this target does not have at the current version. */
  behind: string[];
  /** Why this target cannot be redistributed right now, if it cannot. */
  lockedReason?: string;
  /** Present only when the state is `failed`. */
  error?: string;
};

export type PluginSummary = {
  id: string;
  name: string;
  description: string;
  /**
   * The single source of truth for reach and for health. The rail, the plugin
   * header and the distribution view all read this list, so they cannot
   * contradict each other.
   */
  distributions: DistributionTarget[];
  components: Component[];
};

/** Which half of a plugin is on screen. */
export type PluginView = 'content' | 'distribution';

/** Data volume scenarios, to stress the layout rather than flatter it. */
export type Scenario = 'default' | 'starter' | 'scale' | 'empty';

/** 3 component types (today) or 7 (with the anticipated ones). */
export type TypeHorizon = 'today' | 'planned';

/** Which sidebar to render, so the two information architectures can be flipped in place. */
export type NavMode = 'plugin-first' | 'today';
