import { ArtefactDraft, CommandId, SkillId, StandardId } from '@packmind/types';

/**
 * OSS stub for the proprietary `useDraftOutdatedCount` hook, reached through the
 * `@packmind/proprietary/frontend` alias.
 *
 * The OSS edition ships no merge engine, so there is no way to tell which pending
 * proposals a save would outdate. Reporting `undefined` is the honest answer and
 * makes the save warning fall back to its non-committal wording.
 *
 * The parameters are declared and ignored. They were absent until now, which
 * type checked only because nothing ever called this: the proprietary build
 * resolves the alias to the real hook, and the OSS build had no call site. Both
 * signatures have to match, or the first shared caller fails to compile on the
 * edition this file exists for.
 */
export type DraftOutdatedCount = {
  outdatedCount: number | undefined;
  isChecking: boolean;
};

export function useDraftOutdatedCount(
  _artefactId: StandardId | CommandId | SkillId | undefined,
  _draft: ArtefactDraft | null,
): DraftOutdatedCount {
  return { outdatedCount: undefined, isChecking: false };
}
