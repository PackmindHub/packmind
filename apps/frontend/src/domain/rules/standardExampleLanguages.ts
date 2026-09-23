import {
  getAllLanguagesSortedByDisplayName,
  type ProgrammingLanguage,
  type RuleDetectionStatusSummary,
  type RuleId,
} from '@packmind/types';

/**
 * The languages the rest of a standard is written in, most used first.
 *
 * A rule with no examples has to open on something, and the something used to
 * be JavaScript. That is a guess with nothing behind it, and it is wrong for
 * most of the people using Packmind: a rule of a Kotlin standard opened on a
 * JavaScript editor, with JavaScript highlighting, saying nothing about why.
 *
 * Its siblings are the one signal available without asking. Standards are
 * language-scoped in practice, so a rule of "Java Best Practices" whose
 * neighbours carry Java examples wants Java, and picking it is a reading of
 * this standard rather than a default picked for everyone.
 *
 * The status payload is the right place to read it from even though it is named
 * for detection: its per-rule language list is built from each rule's examples,
 * not from the programs generated off them, so it answers before anything has
 * been generated.
 *
 * Ordered by how many rules use each, so one rule that once got a stray Bash
 * example does not outrank the twenty that are Java. Ties fall back to display
 * order, which is the order the rail uses, so nothing about this is arbitrary
 * twice.
 */
export function standardExampleLanguages(
  statuses: readonly RuleDetectionStatusSummary[] | undefined,
  excludedRuleId?: RuleId,
): ProgrammingLanguage[] {
  const ruleCount = new Map<ProgrammingLanguage, number>();

  (statuses ?? [])
    .filter((summary) => summary.ruleId !== excludedRuleId)
    .forEach((summary) => {
      /*
        Per rule rather than per entry: a rule counts once for a language
        however many examples it has in it.
       */
      new Set(summary.languages.map((entry) => entry.language)).forEach(
        (language) => {
          ruleCount.set(language, (ruleCount.get(language) ?? 0) + 1);
        },
      );
    });

  const displayOrder = new Map(
    getAllLanguagesSortedByDisplayName().map((entry, index) => [
      entry.language,
      index,
    ]),
  );

  return [...ruleCount.keys()].sort((left, right) => {
    const byCount = (ruleCount.get(right) ?? 0) - (ruleCount.get(left) ?? 0);

    if (byCount !== 0) {
      return byCount;
    }

    return (displayOrder.get(left) ?? 0) - (displayOrder.get(right) ?? 0);
  });
}
