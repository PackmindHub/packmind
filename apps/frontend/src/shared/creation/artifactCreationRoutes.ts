import type { ArtifactType } from '@packmind/types';
import { routes } from '../utils/routes';

/**
 * The ways one kind of artifact can come into existence.
 *
 * Four questions, asked of every type, because those are the four the product
 * can answer: an agent writes it from the repo, Packmind ships one ready made,
 * a form in the app writes it, or it arrives from disk. A type answers no to
 * some of them, and the nulls are the point: a skill has no form because it is
 * a folder of files, and saying so here is what keeps the menu from offering
 * one.
 */
export type ArtifactCreationRoutes = {
  /**
   * Whether the agent path can write this type.
   *
   * A flag and not a command, because there is no longer a command per type.
   * Packmind used to ship `packmind-create-standard`, `-command` and `-skill`,
   * and the deployers now actively delete all three: one skill,
   * `packmind-update-playbook`, covers every artifact kind. So the question
   * worth asking of a type here is whether the agent route reaches it at all,
   * and the commands live with the dialog that teaches them.
   */
  agentCanWrite: boolean;
  /** The blank-form route, or null when the type is not a page of fields. */
  formRoute: ((orgSlug: string, spaceSlug: string) => string) | null;
  /** Whether Packmind ships ready-made content of this type. */
  hasSamples: boolean;
  /** Whether the type can arrive from disk or through the CLI. */
  importable: boolean;
};

/**
 * Every type's answers, in one place, keyed on the canonical union.
 *
 * This exists so that adding a type cannot silently skip creating it. The
 * create menu used to be three hand-written hooks composed side by side, which
 * meant a fourth type would compile, list, and distribute while having no way
 * in: the same gap the plugin-first navigation had already opened once, where
 * the routes still answered but had no address in the product.
 *
 * `Record<ArtifactType, ...>` closes it. Add `'mcp'` to `ArtifactType` and this
 * file stops compiling until the four questions are answered, and the menu
 * below rewrites its own lines from the answers.
 */
export const ARTIFACT_CREATION_ROUTES: Record<
  ArtifactType,
  ArtifactCreationRoutes
> = {
  standard: {
    agentCanWrite: true,
    formRoute: routes.space.toCreateStandard,
    hasSamples: true,
    importable: false,
  },
  command: {
    agentCanWrite: true,
    formRoute: routes.space.toCreateCommand,
    hasSamples: false,
    importable: false,
  },
  skill: {
    agentCanWrite: true,
    formRoute: null,
    hasSamples: false,
    importable: true,
  },
};
