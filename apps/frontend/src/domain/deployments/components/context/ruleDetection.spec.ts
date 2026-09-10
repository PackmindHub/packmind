import {
  DetectionSeverity,
  ProgrammingLanguage,
  RuleLanguageDetectionStatus,
  createRuleId,
  type ActiveDetectionProgramId,
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

const PROGRAM_ID = 'program-1' as ActiveDetectionProgramId;

/** An active language the way the API answers for one that reports something. */
function reporting(
  value: ProgrammingLanguage,
  severity: DetectionSeverity = DetectionSeverity.ERROR,
) {
  return {
    language: value,
    status: RuleLanguageDetectionStatus.OK,
    severity,
    activeDetectionProgramId: PROGRAM_ID,
  };
}

function detection(
  state: RuleDetection['state'],
  activeLanguages: ProgrammingLanguage[] = [],
  languages: RuleDetection['languages'] = activeLanguages.map((value) => ({
    language: value,
    state: 'active' as const,
  })),
): RuleDetection {
  return { state, activeLanguages, languages };
}

function inactive(value: ProgrammingLanguage) {
  return { language: value, state: 'inactive' as const };
}

function inProgress(value: ProgrammingLanguage) {
  return { language: value, state: 'in-progress' as const };
}

function active(value: ProgrammingLanguage) {
  return { language: value, state: 'active' as const };
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

  describe('when one language is active', () => {
    const detections = ruleDetectionsById([
      summary(RULE_ID, [
        language(
          ProgrammingLanguage.TYPESCRIPT,
          RuleLanguageDetectionStatus.OK,
        ),
      ]),
    ]);

    it('reads the rule as active in that language', () => {
      expect(detections.get(RULE_ID)).toEqual(
        detection('active', [ProgrammingLanguage.TYPESCRIPT]),
      );
    });
  });

  describe('when one language is active and another is not', () => {
    const detections = ruleDetectionsById([
      summary(RULE_ID, [
        language(ProgrammingLanguage.PYTHON, RuleLanguageDetectionStatus.NONE),
        language(
          ProgrammingLanguage.TYPESCRIPT,
          RuleLanguageDetectionStatus.OK,
        ),
      ]),
    ]);

    it('keeps only the active language', () => {
      expect(detections.get(RULE_ID)?.activeLanguages).toEqual([
        ProgrammingLanguage.TYPESCRIPT,
      ]);
    });

    it('keeps both languages, the active one first', () => {
      expect(detections.get(RULE_ID)?.languages).toEqual([
        active(ProgrammingLanguage.TYPESCRIPT),
        inactive(ProgrammingLanguage.PYTHON),
      ]);
    });
  });

  describe('when one language is active and another is being worked on', () => {
    const detections = ruleDetectionsById([
      summary(RULE_ID, [
        language(ProgrammingLanguage.PYTHON, RuleLanguageDetectionStatus.WIP),
        language(
          ProgrammingLanguage.TYPESCRIPT,
          RuleLanguageDetectionStatus.OK,
        ),
      ]),
    ]);

    it('reads the rule as active rather than in progress', () => {
      expect(detections.get(RULE_ID)?.state).toBe('active');
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

  describe('when no language is active or being worked on', () => {
    const detections = ruleDetectionsById([
      summary(RULE_ID, [
        language(ProgrammingLanguage.PYTHON, RuleLanguageDetectionStatus.NONE),
        language(ProgrammingLanguage.JAVA, RuleLanguageDetectionStatus.NONE),
      ]),
    ]);

    it('reads the rule as inactive', () => {
      expect(detections.get(RULE_ID)).toEqual(
        detection(
          'inactive',
          [],
          [
            inactive(ProgrammingLanguage.JAVA),
            inactive(ProgrammingLanguage.PYTHON),
          ],
        ),
      );
    });
  });

  describe('when several languages are active', () => {
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
      expect(detections.get(RULE_ID)?.activeLanguages).toEqual([
        ProgrammingLanguage.JAVA,
        ProgrammingLanguage.TYPESCRIPT,
      ]);
    });
  });

  describe('when an active language reports at a severity', () => {
    const statuses = [summary(RULE_ID, [reporting(ProgrammingLanguage.JAVA)])];

    it('carries the severity on the language', () => {
      expect(
        ruleDetectionsById(statuses).get(RULE_ID)?.languages[0]?.severity,
      ).toBe(DetectionSeverity.ERROR);
    });

    it('carries the program the severity is set on', () => {
      expect(
        ruleDetectionsById(statuses).get(RULE_ID)?.languages[0]
          ?.activeDetectionProgramId,
      ).toBe(PROGRAM_ID);
    });
  });

  /*
    Half a pair is a control with nowhere to write, so neither half is kept.
  */
  describe('when a severity arrives with no program to set it on', () => {
    const statuses = [
      summary(RULE_ID, [
        {
          language: ProgrammingLanguage.JAVA,
          status: RuleLanguageDetectionStatus.OK,
          severity: DetectionSeverity.WARNING,
        },
      ]),
    ];

    it('leaves the severity out', () => {
      expect(
        ruleDetectionsById(statuses).get(RULE_ID)?.languages[0]?.severity,
      ).toBeUndefined();
    });
  });

  describe('when a language is still being worked on', () => {
    const statuses = [
      summary(RULE_ID, [
        language(ProgrammingLanguage.JAVA, RuleLanguageDetectionStatus.WIP),
      ]),
    ];

    it('carries no severity, nothing being reported yet', () => {
      expect(
        ruleDetectionsById(statuses).get(RULE_ID)?.languages[0]?.severity,
      ).toBeUndefined();
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
  describe('when the rule is active in one language', () => {
    it('names the language', () => {
      expect(
        ruleDetectionLabel(
          detection('active', [ProgrammingLanguage.TYPESCRIPT]),
          spell,
        ),
      ).toBe('Active in TYPESCRIPT');
    });
  });

  describe('when the rule is active in several languages', () => {
    it('counts them rather than listing them', () => {
      expect(
        ruleDetectionLabel(
          detection('active', [
            ProgrammingLanguage.JAVA,
            ProgrammingLanguage.TYPESCRIPT,
          ]),
          spell,
        ),
      ).toBe('Active in 2 languages');
    });
  });

  describe('when the rule is in progress', () => {
    it('says so in the words the detection screens use', () => {
      expect(ruleDetectionLabel(detection('in-progress'), spell)).toBe(
        'In progress',
      );
    });
  });

  describe('when the rule is inactive', () => {
    it('says the rule is not active', () => {
      expect(ruleDetectionLabel(detection('inactive'), spell)).toBe(
        'Not active',
      );
    });
  });
});

describe('ruleDetectionOpens', () => {
  describe('when the rule is active in its only language', () => {
    it('has nothing left to open', () => {
      expect(
        ruleDetectionOpens(
          detection('active', [ProgrammingLanguage.TYPESCRIPT]),
        ),
      ).toBe(false);
    });
  });

  /*
    The one thing in there a reader can change, and the label never carries it.
  */
  describe('when its only language reports at a severity', () => {
    it('opens, to offer the severity', () => {
      expect(
        ruleDetectionOpens(
          detection(
            'active',
            [ProgrammingLanguage.TYPESCRIPT],
            [
              {
                ...active(ProgrammingLanguage.TYPESCRIPT),
                severity: DetectionSeverity.WARNING,
                activeDetectionProgramId: PROGRAM_ID,
              },
            ],
          ),
        ),
      ).toBe(true);
    });
  });

  describe('when the rule is active in one language out of two', () => {
    it('opens, to say which language is the other one', () => {
      expect(
        ruleDetectionOpens(
          detection(
            'active',
            [ProgrammingLanguage.TYPESCRIPT],
            [
              active(ProgrammingLanguage.TYPESCRIPT),
              inactive(ProgrammingLanguage.PYTHON),
            ],
          ),
        ),
      ).toBe(true);
    });
  });

  describe('when the rule is active in several languages', () => {
    it('opens, to name the languages the label only counted', () => {
      expect(
        ruleDetectionOpens(
          detection('active', [
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

  describe('when the rule is inactive', () => {
    it('opens, since the label names no language at all', () => {
      expect(
        ruleDetectionOpens(
          detection('inactive', [], [inactive(ProgrammingLanguage.JAVA)]),
        ),
      ).toBe(true);
    });
  });
});

describe('languageState', () => {
  describe('when the language has a ready program', () => {
    it('reads as active', () => {
      expect(languageState(RuleLanguageDetectionStatus.OK)).toBe('active');
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
    it('reads as inactive', () => {
      expect(languageState(RuleLanguageDetectionStatus.NONE)).toBe('inactive');
    });
  });
});
