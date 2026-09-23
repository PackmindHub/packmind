import {
  ProgrammingLanguage,
  RuleLanguageDetectionStatus,
  createRuleId,
} from '@packmind/types';
import type { RuleDetectionStatusSummary } from '@packmind/types';
import { standardExampleLanguages } from './standardExampleLanguages';

function rule(
  id: string,
  ...languages: ProgrammingLanguage[]
): RuleDetectionStatusSummary {
  return {
    ruleId: createRuleId(id),
    languages: languages.map((language) => ({
      language,
      status: RuleLanguageDetectionStatus.OK,
    })),
  };
}

describe('standardExampleLanguages', () => {
  it('says nothing when no rule of the standard has an example', () => {
    expect(standardExampleLanguages([])).toEqual([]);
  });

  it('says nothing when the standard was never answered for', () => {
    expect(standardExampleLanguages(undefined)).toEqual([]);
  });

  it('reads the languages its rules are written in', () => {
    expect(
      standardExampleLanguages([rule('rule-1', ProgrammingLanguage.KOTLIN)]),
    ).toEqual([ProgrammingLanguage.KOTLIN]);
  });

  /*
    One rule that once got a stray example must not outrank the ones the
    standard is actually about.
  */
  it('puts the language most of its rules use first', () => {
    expect(
      standardExampleLanguages([
        rule('rule-1', ProgrammingLanguage.BASH),
        rule('rule-2', ProgrammingLanguage.KOTLIN),
        rule('rule-3', ProgrammingLanguage.KOTLIN),
      ]),
    ).toEqual([ProgrammingLanguage.KOTLIN, ProgrammingLanguage.BASH]);
  });

  it('counts a rule once per language however many examples it has', () => {
    expect(
      standardExampleLanguages([
        {
          ruleId: createRuleId('rule-1'),
          languages: [
            {
              language: ProgrammingLanguage.PHP,
              status: RuleLanguageDetectionStatus.OK,
            },
            {
              language: ProgrammingLanguage.PHP,
              status: RuleLanguageDetectionStatus.OK,
            },
          ],
        },
        rule('rule-2', ProgrammingLanguage.GO),
        rule('rule-3', ProgrammingLanguage.GO),
      ]),
    ).toEqual([ProgrammingLanguage.GO, ProgrammingLanguage.PHP]);
  });

  /*
    The rule being opened is not evidence about itself: it is asked this
    question precisely because it has nothing.
  */
  it('ignores the rule it is answering for', () => {
    expect(
      standardExampleLanguages(
        [
          rule('rule-1', ProgrammingLanguage.RUST),
          rule('rule-2', ProgrammingLanguage.PYTHON),
        ],
        createRuleId('rule-1'),
      ),
    ).toEqual([ProgrammingLanguage.PYTHON]);
  });
});
