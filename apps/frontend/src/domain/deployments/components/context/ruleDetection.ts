import {
  RuleLanguageDetectionStatus,
  type ProgrammingLanguage,
  type RuleDetectionStatusSummary,
  type RuleId,
} from '@packmind/types';

/**
 * What a standard's rule can say about being checked automatically, read from
 * the detection statuses the proprietary edition answers with.
 *
 * Three states rather than the three per-language ones, because a rule is
 * several languages at once and the question a reader has is about the rule:
 * can Packmind catch a change that breaks this. One language checked is enough
 * for the answer to be yes, and a language still being worked on only matters
 * when no language is checked yet.
 */
export type RuleDetectionState = 'checked' | 'in-progress' | 'unchecked';

export type RuleDetectionLanguage = {
  language: ProgrammingLanguage;
  state: RuleDetectionState;
};

export type RuleDetection = {
  state: RuleDetectionState;
  /** The languages in the `checked` state, and only those. */
  checkedLanguages: ProgrammingLanguage[];
  /**
   * Every language the rule was answered for, checked first and unchecked
   * last. The order is the reading order: what is enforced today comes before
   * what is being worked on, which comes before what nobody has started.
   */
  languages: RuleDetectionLanguage[];
};

/**
 * Keyed by rule, and only for the rules that have something to say: a rule with
 * no language entry at all is absent from the map rather than present with an
 * `unchecked` state. The distinction is what the OSS edition rides on, where
 * the stubbed query answers with an empty array and every rule has to render as
 * plain content with no affordance suggesting there is more.
 */
export function ruleDetectionsById(
  summaries: readonly RuleDetectionStatusSummary[] | undefined,
): Map<RuleId, RuleDetection> {
  const detections = new Map<RuleId, RuleDetection>();

  for (const summary of summaries ?? []) {
    const languages = summary.languages ?? [];

    if (languages.length === 0) {
      continue;
    }

    const checkedLanguages = languages
      .filter(({ status }) => status === RuleLanguageDetectionStatus.OK)
      .map(({ language }) => language)
      .sort((first, second) => first.localeCompare(second));

    const isInProgress = languages.some(
      ({ status }) => status === RuleLanguageDetectionStatus.WIP,
    );

    detections.set(summary.ruleId, {
      state: detectionState(checkedLanguages.length, isInProgress),
      checkedLanguages,
      languages: languages
        .map(({ language, status }) => ({
          language,
          state: languageState(status),
        }))
        .sort(byStateThenName),
    });
  }

  return detections;
}

/** One language's status in the same three words the rule's own status uses. */
export function languageState(
  status: RuleLanguageDetectionStatus,
): RuleDetectionState {
  if (status === RuleLanguageDetectionStatus.OK) {
    return 'checked';
  }

  return status === RuleLanguageDetectionStatus.WIP
    ? 'in-progress'
    : 'unchecked';
}

const STATE_ORDER: Record<RuleDetectionState, number> = {
  checked: 0,
  'in-progress': 1,
  unchecked: 2,
};

function byStateThenName(
  first: RuleDetectionLanguage,
  second: RuleDetectionLanguage,
): number {
  const byState = STATE_ORDER[first.state] - STATE_ORDER[second.state];

  return byState !== 0
    ? byState
    : first.language.localeCompare(second.language);
}

function detectionState(
  checkedCount: number,
  isInProgress: boolean,
): RuleDetectionState {
  if (checkedCount > 0) {
    return 'checked';
  }

  return isInProgress ? 'in-progress' : 'unchecked';
}

/**
 * The line the collapsed row carries.
 *
 * The language's display name comes in as a function rather than being read
 * here, because the module that knows how to spell a language is behind the
 * edition alias: calling it from this file would make the same test read
 * "Checked in TypeScript" in one repository and "Checked in " in the other.
 *
 * Named beyond two languages rather than listed, because the row's own reason
 * to exist is the rule's content and a list of five languages would take the
 * width away from it.
 */
export function ruleDetectionLabel(
  detection: RuleDetection,
  displayName: (language: ProgrammingLanguage) => string,
): string {
  if (detection.state === 'in-progress') {
    return 'In progress';
  }

  if (detection.state === 'unchecked') {
    return 'Not checked';
  }

  const [first] = detection.checkedLanguages;

  return detection.checkedLanguages.length === 1
    ? `Checked in ${displayName(first)}`
    : `Checked in ${detection.checkedLanguages.length} languages`;
}

/**
 * Whether the languages behind a rule say more than its label does.
 *
 * A rule checked in its one and only language has a label that already names
 * that language, so opening it would show the same fact a second time: no
 * chevron there. Every other case has something to add, either the languages
 * the label only counted or the ones it never mentioned because they are not
 * checked.
 */
export function ruleDetectionOpens(detection: RuleDetection): boolean {
  return detection.state !== 'checked' || detection.languages.length > 1;
}
