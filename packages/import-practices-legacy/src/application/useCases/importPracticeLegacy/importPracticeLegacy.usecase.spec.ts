import { stubLogger } from '@packmind/test-utils';
import {
  IAccountsPort,
  ISpacesPort,
  ILinterPort,
  Space,
  Standard,
  Rule,
  ProgrammingLanguage,
  createOrganizationId,
  createUserId,
  createSpaceId,
  createStandardId,
  createRuleId,
  createStandardVersionId,
  DetectionModeEnum,
  DetectionStatus,
  RuleDetectionAssessmentStatus,
} from '@packmind/types';
import { StandardsAdapter } from '@packmind/standards';
import { ImportPracticeLegacyUseCase } from './importPracticeLegacy.usecase';
import { LegacyPracticeInput } from '../../../types';

describe('ImportPracticeLegacyUseCase', () => {
  let usecase: ImportPracticeLegacyUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let standardsAdapter: jest.Mocked<StandardsAdapter>;
  let linterPort: jest.Mocked<ILinterPort>;

  const organizationId = createOrganizationId('org-1');
  const userId = createUserId('user-1');
  const spaceId = createSpaceId('space-1');
  const standardVersionId = createStandardVersionId('sv-1');

  const mockSpace: Space = {
    id: spaceId,
    name: 'Global',
    slug: 'global',
    organizationId,
  };

  const mockUser = {
    id: userId,
    email: 'test@example.com',
    passwordHash: 'hash',
    active: true,
    memberships: [
      {
        userId,
        organizationId,
        role: 'member' as const,
      },
    ],
  };

  const mockOrganization = {
    id: organizationId,
    name: 'Test Org',
    slug: 'test-org',
  };

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(mockUser),
      getOrganizationById: jest.fn().mockResolvedValue(mockOrganization),
    } as unknown as jest.Mocked<IAccountsPort>;

    spacesPort = {
      listSpacesByOrganization: jest.fn().mockResolvedValue([mockSpace]),
    } as unknown as jest.Mocked<ISpacesPort>;

    standardsAdapter = {
      createStandardWithExamples: jest.fn(),
      listStandardsBySpace: jest.fn().mockResolvedValue([]),
      getRulesByStandardId: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<StandardsAdapter>;

    linterPort = {
      createDetectionProgram: jest.fn().mockResolvedValue({}),
      createEmptyRuleDetectionAssessment: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<ILinterPort>;

    usecase = new ImportPracticeLegacyUseCase(
      accountsPort,
      spacesPort,
      standardsAdapter,
      linterPort,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeForMembers', () => {
    describe('when importing a standard with rules and examples', () => {
      it('creates standard with paired examples', async () => {
        const legacyData: LegacyPracticeInput = {
          standards: [
            {
              name: 'Test Standard',
              description: 'A test standard description',
              rules: [
                {
                  name: 'Test Rule',
                  positiveExamples: [
                    { code: 'const x: number = 5;', language: 'TYPESCRIPT' },
                  ],
                  negativeExamples: [
                    { code: 'const x = 5;', language: 'TYPESCRIPT' },
                  ],
                },
              ],
            },
          ],
        };

        const mockStandard: Standard = {
          id: createStandardId('std-1'),
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'A test standard description',
          version: 1,
          gitCommit: undefined,
          userId,
          scope: null,
          spaceId,
        };

        standardsAdapter.createStandardWithExamples.mockResolvedValue(
          mockStandard,
        );

        const result = await usecase.execute({
          userId,
          organizationId,
          legacyData,
        });

        expect(result.importedStandards).toHaveLength(1);
      });

      it('calls createStandardWithExamples with disableTriggerAssessment true', async () => {
        const legacyData: LegacyPracticeInput = {
          standards: [
            {
              name: 'Test Standard',
              description: 'A test description',
              rules: [
                {
                  name: 'Rule 1',
                  positiveExamples: [],
                  negativeExamples: [],
                },
              ],
            },
          ],
        };

        const mockStandard: Standard = {
          id: createStandardId('std-1'),
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'A test description',
          version: 1,
          gitCommit: undefined,
          userId,
          scope: null,
          spaceId,
        };

        standardsAdapter.createStandardWithExamples.mockResolvedValue(
          mockStandard,
        );

        await usecase.execute({
          userId,
          organizationId,
          legacyData,
        });

        expect(
          standardsAdapter.createStandardWithExamples,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            disableTriggerAssessment: true,
          }),
        );
      });
    });

    describe('when examples have different languages', () => {
      it('creates separate pairs for each language', async () => {
        const legacyData: LegacyPracticeInput = {
          standards: [
            {
              name: 'Test Standard',
              description: 'Description',
              rules: [
                {
                  name: 'Rule with mixed languages',
                  positiveExamples: [
                    { code: 'const x = 5;', language: 'JAVASCRIPT' },
                  ],
                  negativeExamples: [{ code: 'int x = 5;', language: 'JAVA' }],
                },
              ],
            },
          ],
        };

        const mockStandard: Standard = {
          id: createStandardId('std-1'),
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Description',
          version: 1,
          gitCommit: undefined,
          userId,
          scope: null,
          spaceId,
        };

        standardsAdapter.createStandardWithExamples.mockResolvedValue(
          mockStandard,
        );

        await usecase.execute({
          userId,
          organizationId,
          legacyData,
        });

        expect(
          standardsAdapter.createStandardWithExamples,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            rules: [
              {
                content: 'Rule with mixed languages',
                examples: expect.arrayContaining([
                  {
                    positive: 'const x = 5;',
                    negative: '',
                    language: ProgrammingLanguage.JAVASCRIPT,
                  },
                  {
                    positive: '',
                    negative: 'int x = 5;',
                    language: ProgrammingLanguage.JAVA,
                  },
                ]),
              },
            ],
          }),
        );
      });

      it('groups examples by language before pairing', async () => {
        const legacyData: LegacyPracticeInput = {
          standards: [
            {
              name: 'Test Standard',
              description: 'Description',
              rules: [
                {
                  name: 'Rule with multiple languages',
                  positiveExamples: [
                    { code: 'js positive 1', language: 'JAVASCRIPT' },
                    { code: 'java positive 1', language: 'JAVA' },
                  ],
                  negativeExamples: [
                    { code: 'js negative 1', language: 'JAVASCRIPT' },
                    { code: 'java negative 1', language: 'JAVA' },
                  ],
                },
              ],
            },
          ],
        };

        const mockStandard: Standard = {
          id: createStandardId('std-1'),
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Description',
          version: 1,
          gitCommit: undefined,
          userId,
          scope: null,
          spaceId,
        };

        standardsAdapter.createStandardWithExamples.mockResolvedValue(
          mockStandard,
        );

        await usecase.execute({
          userId,
          organizationId,
          legacyData,
        });

        expect(
          standardsAdapter.createStandardWithExamples,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            rules: [
              {
                content: 'Rule with multiple languages',
                examples: expect.arrayContaining([
                  {
                    positive: 'js positive 1',
                    negative: 'js negative 1',
                    language: ProgrammingLanguage.JAVASCRIPT,
                  },
                  {
                    positive: 'java positive 1',
                    negative: 'java negative 1',
                    language: ProgrammingLanguage.JAVA,
                  },
                ]),
              },
            ],
          }),
        );
      });
    });

    describe('when pairing examples with unequal lengths within same language', () => {
      it('pairs with empty string for missing positive example', async () => {
        const legacyData: LegacyPracticeInput = {
          standards: [
            {
              name: 'Test Standard',
              description: 'Description',
              rules: [
                {
                  name: 'Rule with more negatives',
                  positiveExamples: [
                    { code: 'positive1', language: 'TYPESCRIPT' },
                  ],
                  negativeExamples: [
                    { code: 'negative1', language: 'TYPESCRIPT' },
                    { code: 'negative2', language: 'TYPESCRIPT' },
                  ],
                },
              ],
            },
          ],
        };

        const mockStandard: Standard = {
          id: createStandardId('std-1'),
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Description',
          version: 1,
          gitCommit: undefined,
          userId,
          scope: null,
          spaceId,
        };

        standardsAdapter.createStandardWithExamples.mockResolvedValue(
          mockStandard,
        );

        await usecase.execute({
          userId,
          organizationId,
          legacyData,
        });

        expect(
          standardsAdapter.createStandardWithExamples,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            rules: [
              {
                content: 'Rule with more negatives',
                examples: [
                  {
                    positive: 'positive1',
                    negative: 'negative1',
                    language: ProgrammingLanguage.TYPESCRIPT,
                  },
                  {
                    positive: '',
                    negative: 'negative2',
                    language: ProgrammingLanguage.TYPESCRIPT,
                  },
                ],
              },
            ],
          }),
        );
      });

      it('pairs with empty string for missing negative example', async () => {
        const legacyData: LegacyPracticeInput = {
          standards: [
            {
              name: 'Test Standard',
              description: 'Description',
              rules: [
                {
                  name: 'Rule with more positives',
                  positiveExamples: [
                    { code: 'positive1', language: 'JAVA' },
                    { code: 'positive2', language: 'JAVA' },
                  ],
                  negativeExamples: [{ code: 'negative1', language: 'JAVA' }],
                },
              ],
            },
          ],
        };

        const mockStandard: Standard = {
          id: createStandardId('std-1'),
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Description',
          version: 1,
          gitCommit: undefined,
          userId,
          scope: null,
          spaceId,
        };

        standardsAdapter.createStandardWithExamples.mockResolvedValue(
          mockStandard,
        );

        await usecase.execute({
          userId,
          organizationId,
          legacyData,
        });

        expect(
          standardsAdapter.createStandardWithExamples,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            rules: [
              {
                content: 'Rule with more positives',
                examples: [
                  {
                    positive: 'positive1',
                    negative: 'negative1',
                    language: ProgrammingLanguage.JAVA,
                  },
                  {
                    positive: 'positive2',
                    negative: '',
                    language: ProgrammingLanguage.JAVA,
                  },
                ],
              },
            ],
          }),
        );
      });
    });

    describe('when standard creation fails', () => {
      it('adds standard to skipped list with error reason', async () => {
        const legacyData: LegacyPracticeInput = {
          standards: [
            {
              name: 'Failing Standard',
              description: 'This will fail',
              rules: [],
            },
          ],
        };

        standardsAdapter.createStandardWithExamples.mockRejectedValue(
          new Error('Database error'),
        );

        const result = await usecase.execute({
          userId,
          organizationId,
          legacyData,
        });

        expect(result.skippedStandards).toHaveLength(1);
      });

      it('includes error message in skipped standard reason', async () => {
        const legacyData: LegacyPracticeInput = {
          standards: [
            {
              name: 'Failing Standard',
              description: 'This will fail',
              rules: [],
            },
          ],
        };

        standardsAdapter.createStandardWithExamples.mockRejectedValue(
          new Error('Database error'),
        );

        const result = await usecase.execute({
          userId,
          organizationId,
          legacyData,
        });

        expect(result.skippedStandards[0].reason).toBe('Database error');
      });
    });

    describe('when no spaces exist in organization', () => {
      it('throws error', async () => {
        spacesPort.listSpacesByOrganization.mockResolvedValue([]);

        const legacyData: LegacyPracticeInput = {
          standards: [],
        };

        await expect(
          usecase.execute({
            userId,
            organizationId,
            legacyData,
          }),
        ).rejects.toThrow(
          'No spaces found in organization. Please create a space first.',
        );
      });
    });

    describe('when importing multiple standards', () => {
      it('returns all successfully imported standards', async () => {
        const legacyData: LegacyPracticeInput = {
          standards: [
            {
              name: 'Standard 1',
              description: 'Description 1',
              rules: [],
            },
            {
              name: 'Standard 2',
              description: 'Description 2',
              rules: [],
            },
          ],
        };

        standardsAdapter.createStandardWithExamples
          .mockResolvedValueOnce({
            id: createStandardId('std-1'),
            name: 'Standard 1',
            slug: 'standard-1',
            description: 'Description 1',
            version: 1,
            gitCommit: undefined,
            userId,
            scope: null,
            spaceId,
          })
          .mockResolvedValueOnce({
            id: createStandardId('std-2'),
            name: 'Standard 2',
            slug: 'standard-2',
            description: 'Description 2',
            version: 1,
            gitCommit: undefined,
            userId,
            scope: null,
            spaceId,
          });

        const result = await usecase.execute({
          userId,
          organizationId,
          legacyData,
        });

        expect(result.importedStandards).toHaveLength(2);
      });

      describe('when one standard fails to import', () => {
        const legacyData: LegacyPracticeInput = {
          standards: [
            {
              name: 'Standard 1',
              description: 'Description 1',
              rules: [],
            },
            {
              name: 'Standard 2',
              description: 'Description 2',
              rules: [],
            },
          ],
        };

        beforeEach(() => {
          standardsAdapter.createStandardWithExamples
            .mockRejectedValueOnce(new Error('Failed'))
            .mockResolvedValueOnce({
              id: createStandardId('std-2'),
              name: 'Standard 2',
              slug: 'standard-2',
              description: 'Description 2',
              version: 1,
              gitCommit: undefined,
              userId,
              scope: null,
              spaceId,
            });
        });

        it('imports the successful standard', async () => {
          const result = await usecase.execute({
            userId,
            organizationId,
            legacyData,
          });

          expect(result.importedStandards).toHaveLength(1);
        });

        it('adds failed standard to skipped list', async () => {
          const result = await usecase.execute({
            userId,
            organizationId,
            legacyData,
          });

          expect(result.skippedStandards).toHaveLength(1);
        });
      });
    });

    describe('when example has invalid language', () => {
      it('creates standard with empty examples for invalid language', async () => {
        const legacyData: LegacyPracticeInput = {
          standards: [
            {
              name: 'Test Standard',
              description: 'Description',
              rules: [
                {
                  name: 'Rule with invalid language',
                  positiveExamples: [
                    { code: 'valid code', language: 'INVALID_LANG' },
                  ],
                  negativeExamples: [],
                },
              ],
            },
          ],
        };

        const mockStandard: Standard = {
          id: createStandardId('std-1'),
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Description',
          version: 1,
          gitCommit: undefined,
          userId,
          scope: null,
          spaceId,
        };

        standardsAdapter.createStandardWithExamples.mockResolvedValue(
          mockStandard,
        );

        const result = await usecase.execute({
          userId,
          organizationId,
          legacyData,
        });

        expect(result.importedStandards).toHaveLength(1);
      });

      it('passes empty examples array for rules with only invalid languages', async () => {
        const legacyData: LegacyPracticeInput = {
          standards: [
            {
              name: 'Test Standard',
              description: 'Description',
              rules: [
                {
                  name: 'Rule with invalid language',
                  positiveExamples: [
                    { code: 'valid code', language: 'INVALID_LANG' },
                  ],
                  negativeExamples: [],
                },
              ],
            },
          ],
        };

        const mockStandard: Standard = {
          id: createStandardId('std-1'),
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Description',
          version: 1,
          gitCommit: undefined,
          userId,
          scope: null,
          spaceId,
        };

        standardsAdapter.createStandardWithExamples.mockResolvedValue(
          mockStandard,
        );

        await usecase.execute({
          userId,
          organizationId,
          legacyData,
        });

        expect(
          standardsAdapter.createStandardWithExamples,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            rules: [
              {
                content: 'Rule with invalid language',
                examples: [],
              },
            ],
          }),
        );
      });
    });

    describe('when rule has detection program', () => {
      const mockRule: Rule = {
        id: createRuleId('rule-1'),
        content: 'Rule with detection program',
        standardVersionId,
      };

      const mockStandard: Standard = {
        id: createStandardId('std-1'),
        name: 'Test Standard',
        slug: 'test-standard',
        description: 'Description',
        version: 1,
        gitCommit: undefined,
        userId,
        scope: null,
        spaceId,
      };

      beforeEach(() => {
        standardsAdapter.createStandardWithExamples.mockResolvedValue(
          mockStandard,
        );
        standardsAdapter.getRulesByStandardId.mockResolvedValue([mockRule]);
      });

      it('imports standard successfully', async () => {
        const legacyData: LegacyPracticeInput = {
          standards: [
            {
              name: 'Test Standard',
              description: 'Description',
              rules: [
                {
                  name: 'Rule with detection program',
                  positiveExamples: [],
                  negativeExamples: [],
                  detectionProgram: {
                    code: 'function detect() {}',
                    description: 'Detects violations',
                    language: 'KOTLIN',
                  },
                },
              ],
            },
          ],
        };

        const result = await usecase.execute({
          userId,
          organizationId,
          legacyData,
        });

        expect(result.importedStandards).toHaveLength(1);
      });

      it('calls createDetectionProgram with correct parameters', async () => {
        const legacyData: LegacyPracticeInput = {
          standards: [
            {
              name: 'Test Standard',
              description: 'Description',
              rules: [
                {
                  name: 'Rule with detection program',
                  positiveExamples: [],
                  negativeExamples: [],
                  detectionProgram: {
                    code: 'function detect() {}',
                    description: 'Detects violations',
                    language: 'KOTLIN',
                  },
                },
              ],
            },
          ],
        };

        await usecase.execute({
          userId,
          organizationId,
          legacyData,
        });

        expect(linterPort.createDetectionProgram).toHaveBeenCalledWith({
          ruleId: mockRule.id,
          code: 'function detect() {}',
          language: ProgrammingLanguage.KOTLIN,
          mode: DetectionModeEnum.SINGLE_AST,
          status: DetectionStatus.READY,
          organizationId,
          userId,
          mustBeDraftVersion: false,
        });
      });

      it('calls createEmptyRuleDetectionAssessment with correct parameters', async () => {
        const legacyData: LegacyPracticeInput = {
          standards: [
            {
              name: 'Test Standard',
              description: 'Description',
              rules: [
                {
                  name: 'Rule with detection program',
                  positiveExamples: [],
                  negativeExamples: [],
                  detectionProgram: {
                    code: 'function detect() {}',
                    description: 'Detects violations',
                    language: 'KOTLIN',
                  },
                },
              ],
            },
          ],
        };

        await usecase.execute({
          userId,
          organizationId,
          legacyData,
        });

        expect(
          linterPort.createEmptyRuleDetectionAssessment,
        ).toHaveBeenCalledWith({
          ruleId: mockRule.id,
          language: ProgrammingLanguage.KOTLIN,
          organizationId,
          userId,
          status: RuleDetectionAssessmentStatus.SUCCESS,
          details: '',
        });
      });

      describe('when rule has no detection program', () => {
        beforeEach(() => {
          standardsAdapter.getRulesByStandardId.mockResolvedValue([
            {
              id: createRuleId('rule-no-program'),
              content: 'Rule without detection program',
              standardVersionId,
            },
          ]);
        });

        const legacyDataWithoutDetectionProgram: LegacyPracticeInput = {
          standards: [
            {
              name: 'Test Standard',
              description: 'Description',
              rules: [
                {
                  name: 'Rule without detection program',
                  positiveExamples: [],
                  negativeExamples: [],
                },
              ],
            },
          ],
        };

        it('does not call createDetectionProgram', async () => {
          await usecase.execute({
            userId,
            organizationId,
            legacyData: legacyDataWithoutDetectionProgram,
          });

          expect(linterPort.createDetectionProgram).not.toHaveBeenCalled();
        });

        it('does not call createEmptyRuleDetectionAssessment', async () => {
          await usecase.execute({
            userId,
            organizationId,
            legacyData: legacyDataWithoutDetectionProgram,
          });

          expect(
            linterPort.createEmptyRuleDetectionAssessment,
          ).not.toHaveBeenCalled();
        });
      });

      describe('when detection program language is invalid', () => {
        it('skips detection program creation', async () => {
          const legacyData: LegacyPracticeInput = {
            standards: [
              {
                name: 'Test Standard',
                description: 'Description',
                rules: [
                  {
                    name: 'Rule with detection program',
                    positiveExamples: [],
                    negativeExamples: [],
                    detectionProgram: {
                      code: 'function detect() {}',
                      description: 'Detects violations',
                      language: 'INVALID_LANGUAGE',
                    },
                  },
                ],
              },
            ],
          };

          await usecase.execute({
            userId,
            organizationId,
            legacyData,
          });

          expect(linterPort.createDetectionProgram).not.toHaveBeenCalled();
        });
      });

      describe('when detection program import fails', () => {
        it('continues importing and returns standard as imported', async () => {
          linterPort.createDetectionProgram.mockRejectedValue(
            new Error('Detection program creation failed'),
          );

          const legacyData: LegacyPracticeInput = {
            standards: [
              {
                name: 'Test Standard',
                description: 'Description',
                rules: [
                  {
                    name: 'Rule with detection program',
                    positiveExamples: [],
                    negativeExamples: [],
                    detectionProgram: {
                      code: 'function detect() {}',
                      description: 'Detects violations',
                      language: 'KOTLIN',
                    },
                  },
                ],
              },
            ],
          };

          const result = await usecase.execute({
            userId,
            organizationId,
            legacyData,
          });

          expect(result.importedStandards).toHaveLength(1);
        });
      });

      describe('when importing multiple rules with detection programs', () => {
        const rule1: Rule = {
          id: createRuleId('rule-1'),
          content: 'Rule 1',
          standardVersionId,
        };
        const rule2: Rule = {
          id: createRuleId('rule-2'),
          content: 'Rule 2',
          standardVersionId,
        };

        const legacyDataWithMultipleRules: LegacyPracticeInput = {
          standards: [
            {
              name: 'Test Standard',
              description: 'Description',
              rules: [
                {
                  name: 'Rule 1',
                  positiveExamples: [],
                  negativeExamples: [],
                  detectionProgram: {
                    code: 'function detect1() {}',
                    description: 'Detects violations 1',
                    language: 'KOTLIN',
                  },
                },
                {
                  name: 'Rule 2',
                  positiveExamples: [],
                  negativeExamples: [],
                  detectionProgram: {
                    code: 'function detect2() {}',
                    description: 'Detects violations 2',
                    language: 'JAVA',
                  },
                },
              ],
            },
          ],
        };

        beforeEach(() => {
          standardsAdapter.getRulesByStandardId.mockResolvedValue([
            rule1,
            rule2,
          ]);
        });

        it('calls createDetectionProgram for each rule', async () => {
          await usecase.execute({
            userId,
            organizationId,
            legacyData: legacyDataWithMultipleRules,
          });

          expect(linterPort.createDetectionProgram).toHaveBeenCalledTimes(2);
        });

        it('calls createEmptyRuleDetectionAssessment for each rule', async () => {
          await usecase.execute({
            userId,
            organizationId,
            legacyData: legacyDataWithMultipleRules,
          });

          expect(
            linterPort.createEmptyRuleDetectionAssessment,
          ).toHaveBeenCalledTimes(2);
        });
      });
    });

    describe('when checking for existing standards', () => {
      describe('when no standards exist in space', () => {
        beforeEach(() => {
          standardsAdapter.listStandardsBySpace.mockResolvedValue([]);
        });

        it('imports the standard successfully', async () => {
          const legacyData: LegacyPracticeInput = {
            standards: [
              {
                name: 'New Standard',
                description: 'Description',
                rules: [],
              },
            ],
          };

          const mockStandard: Standard = {
            id: createStandardId('std-1'),
            name: 'New Standard',
            slug: 'new-standard',
            description: 'Description',
            version: 1,
            gitCommit: undefined,
            userId,
            scope: null,
            spaceId,
          };

          standardsAdapter.createStandardWithExamples.mockResolvedValue(
            mockStandard,
          );

          const result = await usecase.execute({
            userId,
            organizationId,
            legacyData,
          });

          expect(result.importedStandards).toHaveLength(1);
        });
      });

      describe('when existing standards have different names', () => {
        it('imports the standard successfully', async () => {
          const existingStandard: Standard = {
            id: createStandardId('existing-1'),
            name: 'Existing Standard',
            slug: 'existing-standard',
            description: 'Already exists',
            version: 1,
            gitCommit: undefined,
            userId,
            scope: null,
            spaceId,
          };

          standardsAdapter.listStandardsBySpace.mockResolvedValue([
            existingStandard,
          ]);

          const legacyData: LegacyPracticeInput = {
            standards: [
              {
                name: 'Different Standard',
                description: 'Description',
                rules: [],
              },
            ],
          };

          const mockStandard: Standard = {
            id: createStandardId('std-1'),
            name: 'Different Standard',
            slug: 'different-standard',
            description: 'Description',
            version: 1,
            gitCommit: undefined,
            userId,
            scope: null,
            spaceId,
          };

          standardsAdapter.createStandardWithExamples.mockResolvedValue(
            mockStandard,
          );

          const result = await usecase.execute({
            userId,
            organizationId,
            legacyData,
          });

          expect(result.importedStandards).toHaveLength(1);
        });
      });

      describe('when one standard already exists', () => {
        it('throws error with standard name', async () => {
          const existingStandard: Standard = {
            id: createStandardId('existing-1'),
            name: 'Existing Standard',
            slug: 'existing-standard',
            description: 'Already exists',
            version: 1,
            gitCommit: undefined,
            userId,
            scope: null,
            spaceId,
          };

          standardsAdapter.listStandardsBySpace.mockResolvedValue([
            existingStandard,
          ]);

          const legacyData: LegacyPracticeInput = {
            standards: [
              {
                name: 'Existing Standard',
                description: 'Duplicate',
                rules: [],
              },
            ],
          };

          await expect(
            usecase.execute({
              userId,
              organizationId,
              legacyData,
            }),
          ).rejects.toThrow(
            'Cannot import: the following standards already exist: Existing Standard',
          );
        });
      });

      describe('when multiple standards already exist', () => {
        it('throws error listing all conflicting standard names', async () => {
          const existingStandards: Standard[] = [
            {
              id: createStandardId('existing-1'),
              name: 'First Standard',
              slug: 'first-standard',
              description: 'Already exists',
              version: 1,
              gitCommit: undefined,
              userId,
              scope: null,
              spaceId,
            },
            {
              id: createStandardId('existing-2'),
              name: 'Second Standard',
              slug: 'second-standard',
              description: 'Also exists',
              version: 1,
              gitCommit: undefined,
              userId,
              scope: null,
              spaceId,
            },
          ];

          standardsAdapter.listStandardsBySpace.mockResolvedValue(
            existingStandards,
          );

          const legacyData: LegacyPracticeInput = {
            standards: [
              {
                name: 'First Standard',
                description: 'Duplicate 1',
                rules: [],
              },
              {
                name: 'Second Standard',
                description: 'Duplicate 2',
                rules: [],
              },
              {
                name: 'Third Standard',
                description: 'New one',
                rules: [],
              },
            ],
          };

          await expect(
            usecase.execute({
              userId,
              organizationId,
              legacyData,
            }),
          ).rejects.toThrow(
            'Cannot import: the following standards already exist: First Standard, Second Standard',
          );
        });
      });

      describe('when standard names differ only by case', () => {
        it('matches case-insensitively and throws error', async () => {
          const existingStandard: Standard = {
            id: createStandardId('existing-1'),
            name: 'My Standard',
            slug: 'my-standard',
            description: 'Already exists',
            version: 1,
            gitCommit: undefined,
            userId,
            scope: null,
            spaceId,
          };

          standardsAdapter.listStandardsBySpace.mockResolvedValue([
            existingStandard,
          ]);

          const legacyData: LegacyPracticeInput = {
            standards: [
              {
                name: 'MY STANDARD',
                description: 'Same name different case',
                rules: [],
              },
            ],
          };

          await expect(
            usecase.execute({
              userId,
              organizationId,
              legacyData,
            }),
          ).rejects.toThrow(
            'Cannot import: the following standards already exist: My Standard',
          );
        });
      });

      describe('when standards already exist', () => {
        const existingStandard: Standard = {
          id: createStandardId('existing-1'),
          name: 'Existing Standard',
          slug: 'existing-standard',
          description: 'Already exists',
          version: 1,
          gitCommit: undefined,
          userId,
          scope: null,
          spaceId,
        };

        const duplicateLegacyData: LegacyPracticeInput = {
          standards: [
            {
              name: 'Existing Standard',
              description: 'Duplicate',
              rules: [],
            },
          ],
        };

        beforeEach(() => {
          standardsAdapter.listStandardsBySpace.mockResolvedValue([
            existingStandard,
          ]);
        });

        it('throws error before creating any standard', async () => {
          await expect(
            usecase.execute({
              userId,
              organizationId,
              legacyData: duplicateLegacyData,
            }),
          ).rejects.toThrow();
        });

        it('does not call createStandardWithExamples', async () => {
          try {
            await usecase.execute({
              userId,
              organizationId,
              legacyData: duplicateLegacyData,
            });
          } catch {
            // Expected to throw
          }

          expect(
            standardsAdapter.createStandardWithExamples,
          ).not.toHaveBeenCalled();
        });
      });
    });
  });
});
