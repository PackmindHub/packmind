import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  ISpacesPort,
  ILinterPort,
  RuleWithExamples,
  stringToProgrammingLanguage,
  createOrganizationId,
  createUserId,
  createStandardId,
  createSpaceId,
  OrganizationId,
  SpaceId,
  Rule,
  DetectionModeEnum,
  DetectionStatus,
  ProgrammingLanguage,
  RuleDetectionAssessmentStatus,
} from '@packmind/types';
import { StandardsAdapter } from '@packmind/standards';
import {
  IImportPracticeLegacyUseCase,
  ImportPracticeLegacyCommand,
  ImportPracticeLegacyResponse,
  ImportedStandard,
  SkippedStandard,
  LegacyCodeExample,
  LegacyDetectionProgram,
  LegacyRule,
  LegacyStandard,
} from '../../../types';

const origin = 'ImportPracticeLegacyUseCase';

/**
 * Use case for importing legacy practice data into Packmind standards.
 * This use case transforms legacy practice JSON format into standards with rules and examples.
 */
export class ImportPracticeLegacyUseCase
  extends AbstractMemberUseCase<
    ImportPracticeLegacyCommand,
    ImportPracticeLegacyResponse
  >
  implements IImportPracticeLegacyUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly standardsAdapter: StandardsAdapter,
    private readonly linterPort: ILinterPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
    this.logger.info('ImportPracticeLegacyUseCase initialized');
  }

  async executeForMembers(
    command: ImportPracticeLegacyCommand & MemberContext,
  ): Promise<ImportPracticeLegacyResponse> {
    this.logger.info('Starting legacy practice import', {
      standardsCount: command.legacyData.standards.length,
      organizationId: command.organizationId,
    });

    const importedStandards: ImportedStandard[] = [];
    const skippedStandards: SkippedStandard[] = [];

    // Get the global space for the organization
    const spaces = await this.spacesPort.listSpacesByOrganization(
      createOrganizationId(command.organizationId),
    );

    if (!spaces || spaces.length === 0) {
      throw new Error(
        'No spaces found in organization. Please create a space first.',
      );
    }

    const globalSpace = spaces[0];
    this.logger.info('Using global space for import', {
      spaceId: globalSpace.id,
      spaceName: globalSpace.name,
    });

    // Check for existing standards before importing
    await this.checkForExistingStandards(
      command.legacyData.standards,
      globalSpace.id,
      createOrganizationId(command.organizationId),
      command.userId,
    );

    // Process each legacy standard
    for (const legacyStandard of command.legacyData.standards) {
      try {
        const result = await this.importStandard(
          legacyStandard,
          command.organizationId,
          command.userId,
          globalSpace.id,
        );
        importedStandards.push(result);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.error('Failed to import standard', {
          standardName: legacyStandard.name,
          reason,
        });
        skippedStandards.push({
          name: legacyStandard.name,
          reason,
        });
      }
    }

    this.logger.info('Legacy practice import completed', {
      importedCount: importedStandards.length,
      skippedCount: skippedStandards.length,
    });

    return {
      importedStandards,
      skippedStandards,
    };
  }

  private async importStandard(
    legacyStandard: LegacyStandard,
    organizationId: string,
    userId: string,
    spaceId: string,
  ): Promise<ImportedStandard> {
    this.logger.info('Importing standard', {
      name: legacyStandard.name,
      rulesCount: legacyStandard.rules.length,
    });

    // Transform legacy rules to RuleWithExamples format
    const rules = this.transformRules(legacyStandard.rules);

    // Create the standard using the adapter with assessment disabled
    const standard = await this.standardsAdapter.createStandardWithExamples({
      name: legacyStandard.name,
      description: legacyStandard.description,
      summary: null, // Will be auto-generated
      rules,
      organizationId: createOrganizationId(organizationId),
      userId: createUserId(userId),
      scope: null,
      spaceId: createSpaceId(spaceId),
      disableTriggerAssessment: true,
    });

    this.logger.info('Standard imported successfully', {
      standardId: standard.id,
      slug: standard.slug,
    });

    // Import detection programs for rules that have them
    await this.importDetectionPrograms(
      legacyStandard.rules,
      standard.id,
      organizationId,
      userId,
    );

    return {
      name: standard.name,
      slug: standard.slug,
    };
  }

  /**
   * Checks if any of the legacy standards already exist in the target space.
   * Throws an error listing all conflicting standard names if any exist.
   */
  private async checkForExistingStandards(
    legacyStandards: LegacyStandard[],
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: string,
  ): Promise<void> {
    // Get existing standards in the space
    const existingStandards = await this.standardsAdapter.listStandardsBySpace(
      spaceId,
      organizationId,
      userId,
    );

    // Create a map of existing names (lowercase for case-insensitive comparison)
    const existingNameMap = new Map(
      existingStandards.map((s) => [s.name.toLowerCase(), s.name]),
    );

    // Find all conflicting standards
    const conflictingStandards = legacyStandards
      .filter((legacy) => existingNameMap.has(legacy.name.toLowerCase()))
      .map((legacy) => existingNameMap.get(legacy.name.toLowerCase())!);

    if (conflictingStandards.length > 0) {
      throw new Error(
        `Cannot import: the following standards already exist: ${conflictingStandards.join(', ')}`,
      );
    }
  }

  /**
   * Import detection programs for rules that have them defined in the legacy data.
   */
  private async importDetectionPrograms(
    legacyRules: LegacyRule[],
    standardId: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    // Get the rules that were created for this standard
    const createdRules = await this.standardsAdapter.getRulesByStandardId(
      createStandardId(standardId),
    );

    // Create a map from rule content (name) to created rule
    const rulesByContent = new Map<string, Rule>();
    for (const rule of createdRules) {
      rulesByContent.set(rule.content, rule);
    }

    // Count how many detection programs we have to import
    const rulesWithPrograms = legacyRules.filter(
      (rule) => rule.detectionProgram,
    );
    this.logger.info('Starting detection program import', {
      standardId,
      rulesWithDetectionPrograms: rulesWithPrograms.length,
      totalRules: legacyRules.length,
    });

    // Import each detection program
    for (const legacyRule of legacyRules) {
      if (!legacyRule.detectionProgram) {
        continue;
      }

      const createdRule = rulesByContent.get(legacyRule.name);
      if (!createdRule) {
        this.logger.warn('Could not find created rule for legacy rule', {
          legacyRuleName: legacyRule.name,
        });
        continue;
      }

      await this.importDetectionProgramForRule(
        createdRule,
        legacyRule.detectionProgram,
        organizationId,
        userId,
      );
    }

    this.logger.info('Detection program import completed', {
      standardId,
      importedCount: rulesWithPrograms.length,
    });
  }

  /**
   * Import a single detection program for a rule.
   */
  private async importDetectionProgramForRule(
    rule: Rule,
    detectionProgram: LegacyDetectionProgram,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    // Convert language string to ProgrammingLanguage
    let language: ProgrammingLanguage;
    try {
      language = stringToProgrammingLanguage(detectionProgram.language);
    } catch {
      this.logger.warn(
        'Invalid programming language for detection program, skipping',
        {
          ruleId: rule.id,
          language: detectionProgram.language,
        },
      );
      return;
    }

    if (!language) {
      this.logger.warn(
        'Unknown programming language for detection program, skipping',
        {
          ruleId: rule.id,
          language: detectionProgram.language,
        },
      );
      return;
    }

    this.logger.info('Importing detection program for rule', {
      ruleId: rule.id,
      ruleContent: rule.content.substring(0, 50),
      language,
    });

    try {
      // Create the detection program (this also creates ActiveDetectionProgram)
      await this.linterPort.createDetectionProgram({
        ruleId: rule.id,
        code: detectionProgram.code,
        language,
        mode: DetectionModeEnum.SINGLE_AST,
        status: DetectionStatus.READY,
        organizationId,
        userId,
        mustBeDraftVersion: false,
      });

      this.logger.info('Detection program created successfully', {
        ruleId: rule.id,
        language,
      });

      // Create RuleDetectionAssessment with SUCCESS status for imported detection program
      await this.linterPort.createEmptyRuleDetectionAssessment({
        ruleId: rule.id,
        language,
        organizationId,
        userId,
        status: RuleDetectionAssessmentStatus.SUCCESS,
        details: '',
      });

      this.logger.info(
        'Rule detection assessment created with SUCCESS status',
        {
          ruleId: rule.id,
          language,
        },
      );
    } catch (error) {
      this.logger.error('Failed to import detection program for rule', {
        ruleId: rule.id,
        language,
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue with other detection programs even if one fails
    }
  }

  private transformRules(legacyRules: LegacyRule[]): RuleWithExamples[] {
    return legacyRules.map((rule) => {
      // Pair positive and negative examples sequentially
      const examples = this.pairExamples(
        rule.positiveExamples,
        rule.negativeExamples,
      );

      return {
        content: rule.name,
        examples,
      };
    });
  }

  /**
   * Groups examples by programming language and pairs positive/negative examples within each language.
   * If there are more of one type than the other within a language, creates pairs with empty strings for missing examples.
   *
   * Example: 1 JS positive + 1 JAVA negative = 2 pairs (JS pair with empty negative, JAVA pair with empty positive)
   */
  private pairExamples(
    positiveExamples: LegacyCodeExample[],
    negativeExamples: LegacyCodeExample[],
  ): RuleWithExamples['examples'] {
    const pairs: NonNullable<RuleWithExamples['examples']> = [];

    // Group examples by language
    const positiveByLanguage = this.groupExamplesByLanguage(positiveExamples);
    const negativeByLanguage = this.groupExamplesByLanguage(negativeExamples);

    // Get all unique languages from both positive and negative examples
    const allLanguages = new Set([
      ...positiveByLanguage.keys(),
      ...negativeByLanguage.keys(),
    ]);

    // For each language, pair positive and negative examples sequentially
    for (const languageString of allLanguages) {
      let language;
      try {
        language = stringToProgrammingLanguage(languageString);
      } catch {
        this.logger.warn('Invalid programming language, skipping examples', {
          language: languageString,
        });
        continue;
      }

      if (!language) {
        this.logger.warn('Unknown programming language, skipping examples', {
          language: languageString,
        });
        continue;
      }

      const positives = positiveByLanguage.get(languageString) || [];
      const negatives = negativeByLanguage.get(languageString) || [];
      const maxLength = Math.max(positives.length, negatives.length);

      for (let i = 0; i < maxLength; i++) {
        pairs.push({
          positive: positives[i]?.code || '',
          negative: negatives[i]?.code || '',
          language,
        });
      }
    }

    return pairs;
  }

  /**
   * Groups code examples by their language.
   */
  private groupExamplesByLanguage(
    examples: LegacyCodeExample[],
  ): Map<string, LegacyCodeExample[]> {
    const grouped = new Map<string, LegacyCodeExample[]>();

    for (const example of examples) {
      if (!example.language) {
        this.logger.warn('Example has no language, skipping', {
          codePreview: example.code.substring(0, 50),
        });
        continue;
      }

      const existing = grouped.get(example.language) || [];
      existing.push(example);
      grouped.set(example.language, existing);
    }

    return grouped;
  }
}
