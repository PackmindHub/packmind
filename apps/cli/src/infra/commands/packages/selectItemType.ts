import { ItemType } from '../../../domain/entities/ItemType';
import { logErrorConsole } from '../../utils/consoleLogger';

export type ItemSlugOptions = {
  standards?: string[];
  commands?: string[];
  skills?: string[];
};

/**
 * Picks the single artefact kind the user named across `--standard`,
 * `--command` and `--skill`.
 *
 * The three package membership commands each act on one kind at a time: their
 * output speaks about "the command" or "the standard", and the API takes one
 * kind per call, so mixing kinds in a single invocation is refused rather than
 * silently split into several operations.
 */
export function selectItemType(
  options: ItemSlugOptions,
  verb: 'add' | 'move' | 'remove',
  exit: (code: number) => never,
): { itemType: ItemType; itemSlugs: string[] } {
  const named = (
    [
      { type: 'standard' as ItemType, slugs: options.standards ?? [] },
      { type: 'command' as ItemType, slugs: options.commands ?? [] },
      { type: 'skill' as ItemType, slugs: options.skills ?? [] },
    ] as { type: ItemType; slugs: string[] }[]
  ).filter((candidate) => candidate.slugs.length > 0);

  if (named.length === 0) {
    logErrorConsole(
      'Error: At least one --standard, --command, or --skill is required',
    );
    exit(1);
  }

  if (named.length > 1) {
    logErrorConsole(
      `Cannot ${verb} standards, commands, and skills simultaneously. Use one invocation per artefact type.`,
    );
    exit(1);
  }

  return { itemType: named[0].type, itemSlugs: named[0].slugs };
}
