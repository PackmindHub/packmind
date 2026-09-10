import {
  RuleLanguageDetectionStatus,
  type ActiveDetectionProgramId,
  type DetectionSeverity,
  type ProgrammingLanguage,
  type RuleDetectionStatusSummary,
  type RuleId,
} from '@packmind/types';

/**
 * What a standard's rule can say about being detected automatically, read from
 * the detection statuses the proprietary edition answers with.
 *
 * The three words are the detection screens' own: a program that is ready is
 * `Active`, a program that is not is `In progress`. The third state is theirs
 * by extension, since a badge only exists there once a program does.
 *
 * Three states rather than the three per-language ones, because a rule is
 * several languages at once and the question a reader has is about the rule:
 * can Packmind catch a change that breaks this. One active language is enough
 * for the answer to be yes, and a language still being worked on only matters
 * when no language is active yet.
 */
export type RuleDetectionState = 'active' | 'in-progress' | 'inactive';

export type RuleDetectionLanguage = {
  language: ProgrammingLanguage;
  state: RuleDetectionState;
  /**
   * What a violation is reported as, and the program it is set on.
   *
   * Together or not at all: changing a severity is a call about one program,
   * and a severity with no program to set it on is a control with nowhere to
   * write. The API answers with both or neither, and this keeps that true one
   * step further in.
   *
   * Only an active language has them. A language whose program is still being
   * worked on reports nothing yet, so there is nothing to choose.
   */
  severity?: DetectionSeverity;
  activeDetectionProgramId?: ActiveDetectionProgramId;
};

export type RuleDetection = {
  state: RuleDetectionState;
  /** The languages in the `active` state, and only those. */
  activeLanguages: ProgrammingLanguage[];
  /**
   * Every language the rule was answered for, active first and inactive last.
   * The order is the reading order: what is enforced today comes before what is
   * being worked on, which comes before what nobody has started.
   */
  languages: RuleDetectionLanguage[];
};

/**
 * Keyed by rule, and only for the rules that have something to say: a rule with
 * no language entry at all is absent from the map rather than present with an
 * `inactive` state. The distinction is what the OSS edition rides on, where the
 * stubbed query answers with an empty array and every rule has to render as
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

    const activeLanguages = languages
      .filter(({ status }) => status === RuleLanguageDetectionStatus.OK)
      .map(({ language }) => language)
      .sort((first, second) => first.localeCompare(second));

    const isInProgress = languages.some(
      ({ status }) => status === RuleLanguageDetectionStatus.WIP,
    );

    detections.set(summary.ruleId, {
      state: detectionState(activeLanguages.length, isInProgress),
      activeLanguages,
      languages: languages
        .map(({ language, status, severity, activeDetectionProgramId }) => ({
          language,
          state: languageState(status),
          /*
           * Dropped unless the pair is complete, for the reason the type gives:
           * half of it is a control with nowhere to write.
           */
          ...(severity && activeDetectionProgramId
            ? { severity, activeDetectionProgramId }
            : {}),
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
    return 'active';
  }

  return status === RuleLanguageDetectionStatus.WIP
    ? 'in-progress'
    : 'inactive';
}

const STATE_ORDER: Record<RuleDetectionState, number> = {
  active: 0,
  'in-progress': 1,
  inactive: 2,
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
  activeCount: number,
  isInProgress: boolean,
): RuleDetectionState {
  if (activeCount > 0) {
    return 'active';
  }

  return isInProgress ? 'in-progress' : 'inactive';
}

/**
 * The line the collapsed row carries.
 *
 * The language's display name comes in as a function rather than being read
 * here, because the module that knows how to spell a language is behind the
 * edition alias: calling it from this file would make the same test read
 * "Active in TypeScript" in one repository and "Active in " in the other.
 *
 * Counted beyond one language rather than listed, because the row's own reason
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

  if (detection.state === 'inactive') {
    return 'Not active';
  }

  const [first] = detection.activeLanguages;

  return detection.activeLanguages.length === 1
    ? `Active in ${displayName(first)}`
    : `Active in ${detection.activeLanguages.length} languages`;
}

/**
 * Whether the languages behind a rule say more than its label does.
 *
 * A rule active in its one and only language has a label that already names
 * that language, so opening it would show the same fact a second time. Every
 * other case has something to add: the languages the label only counted, the
 * ones it never mentioned because nothing detects them, or a severity, which
 * the label never carries and which is the one thing in here a reader can
 * change.
 *
 * Severity is asked of the data rather than assumed from the state, because an
 * active language can arrive without one. No chevron opening onto nothing is
 * the rule this whole affordance was built on.
 */
export function ruleDetectionOpens(detection: RuleDetection): boolean {
  return (
    detection.state !== 'active' ||
    detection.languages.length > 1 ||
    detection.languages.some((language) => language.severity)
  );
}
