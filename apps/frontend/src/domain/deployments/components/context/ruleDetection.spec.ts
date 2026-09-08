import {
  ProgrammingLanguage,
  RuleLanguageDetectionStatus,
  createRuleId,
  type RuleDetectionStatusSummary,
} from '@packmind/types';

import {
  languageState,
  ruleDetectionLabel,
  ruleDetectionOpens,
  ruleDetectionsById,
  type RuleDetection,
} from './ruleDetection';

const RULE_ID = createRuleId('rule-1');
const OTHER_RULE_ID = createRuleId('rule-2');

function summary(
  ruleId: RuleDetectionStatusSummary['ruleId'],
  languages: RuleDetectionStatusSummary['languages'],
): RuleDetectionStatusSummary {
  return { ruleId, languages };
}

function language(
  value: ProgrammingLanguage,
  status: RuleLanguageDetectionStatus,
) {
  return { language: value, status };
}

function detection(
  state: RuleDetection['state'],
  checkedLanguages: ProgrammingLanguage[] = [],
  languages: RuleDetection['languages'] = checkedLanguages.map((value) => ({
    language: value,
    state: 'checked' as const,
  })),
): RuleDetection {
  return { state, checkedLanguages, languages };
}

function unchecked(value: ProgrammingLanguage) {
  return { language: value, state: 'unchecked' as const };
}

function inProgress(value: ProgrammingLanguage) {
  return { language: value, state: 'in-progress' as const };
}

function checked(value: ProgrammingLanguage) {
  return { language: value, state: 'checked' as const };
}

/** Spelled the way the alias-free tests need it: the identity of the enum. */
function spell(value: ProgrammingLanguage): string {
  return value;
}

describe('ruleDetectionsById', () => {
  it('is empty for no statuses at all', () => {
    expect(ruleDetectionsById(undefined).size).toBe(0);
  });

  it('is empty for the empty answer the OSS stub gives', () => {
    expect(ruleDetectionsById([]).size).toBe(0);
  });

  describe('when a rule carries no language', () => {
    const detections = ruleDetectionsById([summary(RULE_ID, [])]);

    it('leaves the rule out of the map', () => {
      expect(detections.has(RULE_ID)).toBe(false);
    });
  });

  describe('when one language is checked', () => {
    const detections = ruleDetectionsById([
      summary(RULE_ID, [
        language(
          ProgrammingLanguage.TYPESCRIPT,
          RuleLanguageDetectionStatus.OK,
        ),
      ]),
    ]);

    it('reads the rule as checked in that language', () => {
      expect(detections.get(RULE_ID)).toEqual(
        detection('checked', [ProgrammingLanguage.TYPESCRIPT]),
      );
    });
  });

  describe('when one language is checked and another is not', () => {
    const detections = ruleDetectionsById([
      summary(RULE_ID, [
        language(ProgrammingLanguage.PYTHON, RuleLanguageDetectionStatus.NONE),
        language(
          ProgrammingLanguage.TYPESCRIPT,
          RuleLanguageDetectionStatus.OK,
        ),
      ]),
    ]);

    it('keeps only the checked language', () => {
      expect(detections.get(RULE_ID)?.checkedLanguages).toEqual([
        ProgrammingLanguage.TYPESCRIPT,
      ]);
    });

    it('keeps both languages, the checked one first', () => {
      expect(detections.get(RULE_ID)?.languages).toEqual([
        checked(ProgrammingLanguage.TYPESCRIPT),
        unchecked(ProgrammingLanguage.PYTHON),
      ]);
    });
  });

  describe('when one language is checked and another is being worked on', () => {
    const detections = ruleDetectionsById([
      summary(RULE_ID, [
        language(ProgrammingLanguage.PYTHON, RuleLanguageDetectionStatus.WIP),
        language(
          ProgrammingLanguage.TYPESCRIPT,
          RuleLanguageDetectionStatus.OK,
        ),
      ]),
    ]);

    it('reads the rule as checked rather than in progress', () => {
      expect(detections.get(RULE_ID)?.state).toBe('checked');
    });
  });

  describe('when the only language is being worked on', () => {
    const detections = ruleDetectionsById([
      summary(RULE_ID, [
        language(ProgrammingLanguage.PYTHON, RuleLanguageDetectionStatus.WIP),
      ]),
    ]);

    it('reads the rule as in progress', () => {
      expect(detections.get(RULE_ID)).toEqual(
        detection('in-progress', [], [inProgress(ProgrammingLanguage.PYTHON)]),
      );
    });
  });

  describe('when no language is checked or being worked on', () => {
    const detections = ruleDetectionsById([
      summary(RULE_ID, [
        language(ProgrammingLanguage.PYTHON, RuleLanguageDetectionStatus.NONE),
        language(ProgrammingLanguage.JAVA, RuleLanguageDetectionStatus.NONE),
      ]),
    ]);

    it('reads the rule as unchecked', () => {
      expect(detections.get(RULE_ID)).toEqual(
        detection(
          'unchecked',
          [],
          [
            unchecked(ProgrammingLanguage.JAVA),
            unchecked(ProgrammingLanguage.PYTHON),
          ],
        ),
      );
    });
  });

  describe('when several languages are checked', () => {
    const detections = ruleDetectionsById([
      summary(RULE_ID, [
        language(
          ProgrammingLanguage.TYPESCRIPT,
          RuleLanguageDetectionStatus.OK,
        ),
        language(ProgrammingLanguage.JAVA, RuleLanguageDetectionStatus.OK),
      ]),
    ]);

    it('orders them, so the same statuses always read the same way', () => {
      expect(detections.get(RULE_ID)?.checkedLanguages).toEqual([
        ProgrammingLanguage.JAVA,
        ProgrammingLanguage.TYPESCRIPT,
      ]);
    });
  });

  describe('when several rules answer at once', () => {
    const detections = ruleDetectionsById([
      summary(RULE_ID, [
        language(
          ProgrammingLanguage.TYPESCRIPT,
          RuleLanguageDetectionStatus.OK,
        ),
      ]),
      summary(OTHER_RULE_ID, []),
    ]);

    it('keeps the one that has something to say', () => {
      expect(Array.from(detections.keys())).toEqual([RULE_ID]);
    });
  });
});

describe('ruleDetectionLabel', () => {
  describe('when the rule is checked in one language', () => {
    it('names the language', () => {
      expect(
        ruleDetectionLabel(
          detection('checked', [ProgrammingLanguage.TYPESCRIPT]),
          spell,
        ),
      ).toBe('Checked in TYPESCRIPT');
    });
  });

  describe('when the rule is checked in several languages', () => {
    it('counts them rather than listing them', () => {
      expect(
        ruleDetectionLabel(
          detection('checked', [
            ProgrammingLanguage.JAVA,
            ProgrammingLanguage.TYPESCRIPT,
          ]),
          spell,
        ),
      ).toBe('Checked in 2 languages');
    });
  });

  describe('when the rule is in progress', () => {
    it('says so in the words the detection screens use', () => {
      expect(ruleDetectionLabel(detection('in-progress'), spell)).toBe(
        'In progress',
      );
    });
  });

  describe('when the rule is unchecked', () => {
    it('says the rule is not checked', () => {
      expect(ruleDetectionLabel(detection('unchecked'), spell)).toBe(
        'Not checked',
      );
    });
  });
});

describe('ruleDetectionOpens', () => {
  describe('when the rule is checked in its only language', () => {
    it('has nothing left to open', () => {
      expect(
        ruleDetectionOpens(
          detection('checked', [ProgrammingLanguage.TYPESCRIPT]),
        ),
      ).toBe(false);
    });
  });

  describe('when the rule is checked in one language out of two', () => {
    it('opens, to say which language is the other one', () => {
      expect(
        ruleDetectionOpens(
          detection(
            'checked',
            [ProgrammingLanguage.TYPESCRIPT],
            [
              checked(ProgrammingLanguage.TYPESCRIPT),
              unchecked(ProgrammingLanguage.PYTHON),
            ],
          ),
        ),
      ).toBe(true);
    });
  });

  describe('when the rule is checked in several languages', () => {
    it('opens, to name the languages the label only counted', () => {
      expect(
        ruleDetectionOpens(
          detection('checked', [
            ProgrammingLanguage.JAVA,
            ProgrammingLanguage.TYPESCRIPT,
          ]),
        ),
      ).toBe(true);
    });
  });

  describe('when the rule is in progress', () => {
    it('opens, since the label names no language at all', () => {
      expect(
        ruleDetectionOpens(
          detection('in-progress', [], [inProgress(ProgrammingLanguage.JAVA)]),
        ),
      ).toBe(true);
    });
  });

  describe('when the rule is unchecked', () => {
    it('opens, since the label names no language at all', () => {
      expect(
        ruleDetectionOpens(
          detection('unchecked', [], [unchecked(ProgrammingLanguage.JAVA)]),
        ),
      ).toBe(true);
    });
  });
});

describe('languageState', () => {
  describe('when the language has a ready program', () => {
    it('reads as checked', () => {
      expect(languageState(RuleLanguageDetectionStatus.OK)).toBe('checked');
    });
  });

  describe('when the language has a program that is not ready', () => {
    it('reads as in progress', () => {
      expect(languageState(RuleLanguageDetectionStatus.WIP)).toBe(
        'in-progress',
      );
    });
  });

  describe('when the language has no program', () => {
    it('reads as unchecked', () => {
      expect(languageState(RuleLanguageDetectionStatus.NONE)).toBe('unchecked');
    });
  });
});
