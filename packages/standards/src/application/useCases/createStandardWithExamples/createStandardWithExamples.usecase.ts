import { StandardService } from '../../services/StandardService';
import {
  StandardVersionService,
  CreateStandardVersionData,
} from '../../services/StandardVersionService';
import { StandardSummaryService } from '../../services/StandardSummaryService';
import { Standard } from '../../../domain/entities/Standard';
import { StandardVersionId } from '../../../domain/entities/StandardVersion';
import { createRuleId, RuleId } from '../../../domain/entities/Rule';
import {
  RuleExample,
  createRuleExampleId,
} from '../../../domain/entities/RuleExample';
import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import slug from 'slug';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AiNotConfigured, getErrorMessage } from '@packmind/node-utils';
import { RuleWithExamples } from '@packmind/types';
import { OrganizationId, UserId } from '@packmind/types';
import { SpaceId, ProgrammingLanguage } from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import type { ILinterPort } from '@packmind/types';

const origin = 'CreateStandardWithExamplesUsecase';

export type CreateStandardWithExamplesRequest = {
  name: string;
  description: string;
  summary: string | null;
  rules: RuleWithExamples[];
  organizationId: OrganizationId;
  userId: UserId;
  scope: string | null;
  spaceId: SpaceId;
};

export class CreateStandardWithExamplesUsecase {
  constructor(
    private readonly standardService: StandardService,
    private readonly standardVersionService: StandardVersionService,
    private readonly standardSummaryService: StandardSummaryService,
    private readonly ruleExampleRepository: IRuleExampleRepository,
    private readonly ruleRepository: IRuleRepository,
    private readonly _linterAdapter?: ILinterPort,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('CreateStandardWithExamplesUsecase initialized', {
      hasLinterAdapter: !!_linterAdapter,
      linterAdapterType: _linterAdapter ? typeof _linterAdapter : 'undefined',
    });
  }

  public async createStandardWithExamples({
    name,
    description,
    summary,
    rules,
    organizationId,
    userId,
    scope,
    spaceId,
  }: CreateStandardWithExamplesRequest) {
    this.logger.info('Starting createStandardWithExamples process', {
      name,
      organizationId,
      userId,
      rulesCount: rules.length,
      rulesWithExamples: rules.filter(
        (r) => r.examples && r.examples.length > 0,
      ).length,
      scope,
    });

    try {
      this.logger.info('Generating slug from standard name', { name });
      const baseSlug = slug(name);
      this.logger.info('Base slug generated', { slug: baseSlug });

      // Ensure slug is unique per space. If it exists, append "-1", "-2", ... until unique
      this.logger.info('Checking slug uniqueness within space', {
        baseSlug,
        spaceId,
        organizationId,
      });
      const existingStandards =
        await this.standardService.listStandardsBySpace(spaceId);
      const existingSlugs = new Set(existingStandards.map((s) => s.slug));

      let standardSlug = baseSlug;
      if (existingSlugs.has(standardSlug)) {
        let counter = 1;
        while (existingSlugs.has(`${baseSlug}-${counter}`)) {
          counter++;
        }
        standardSlug = `${baseSlug}-${counter}`;
      }
      this.logger.info('Resolved unique slug', { slug: standardSlug });

      // Business logic: Create standard with initial version 1
      const initialVersion = 1;

      this.logger.info('Creating standard entity');
      const standard = await this.standardService.addStandard({
        name,
        description,
        slug: standardSlug,
        version: initialVersion,
        gitCommit: undefined,
        userId,
        scope,
        spaceId,
      });
      this.logger.info('Standard entity created successfully', {
        standardId: standard.id,
        name,
        organizationId,
        userId,
      });

      // Process rules and prepare examples
      const processedRules = await this.processRulesWithExamples(rules);

      // Use provided summary or generate one if null/empty
      let finalSummary: string | null = summary || null;
      if (!summary || summary.trim() === '') {
        finalSummary = await this.generateStandardVersionSummary(
          standard,
          name,
          standardSlug,
          description,
          initialVersion,
          scope,
          processedRules.map((r) => ({
            content: r.content,
            examples: r.examples,
          })),
        );
      } else {
        this.logger.info('Summary passed in input, will not be computed', {
          standardId: standard.id,
        });
      }

      this.logger.info(
        'Creating initial standard version with rules and examples',
      );
      const standardVersionData: CreateStandardVersionData = {
        standardId: standard.id,
        name,
        slug: standardSlug,
        description,
        version: initialVersion,
        rules: processedRules,
        scope,
        summary: finalSummary,
        userId, // Track the user who created this through MCP
      };

      const standardVersion =
        await this.standardVersionService.addStandardVersion(
          standardVersionData,
        );
      this.logger.info(
        'Initial standard version and rules created successfully',
        {
          versionId: standardVersion.id,
          standardId: standard.id,
          version: initialVersion,
          rulesCount: rules.length,
          totalExamples: processedRules.reduce(
            (sum, r) => sum + r.examples.length,
            0,
          ),
        },
      );

      // Validate detection programs for all rules with examples
      await this.assessRulesDetections(
        standardVersion.id,
        organizationId,
        userId,
      );

      this.logger.info(
        'CreateStandardWithExamples process completed successfully',
        {
          standardId: standard.id,
          versionId: standardVersion.id,
          name,
          organizationId,
          userId,
          rulesCount: rules.length,
        },
      );

      return standard;
    } catch (error) {
      this.logger.error('Failed to create standard with examples', {
        name,
        organizationId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async processRulesWithExamples(
    rules: RuleWithExamples[],
  ): Promise<Array<{ content: string; examples: RuleExample[] }>> {
    this.logger.info('Processing rules with examples', {
      rulesCount: rules.length,
    });

    const processedRules: Array<{ content: string; examples: RuleExample[] }> =
      [];

    for (const rule of rules) {
      const ruleExamples: RuleExample[] = [];

      if (rule.examples && rule.examples.length > 0) {
        this.logger.debug('Processing examples for rule', {
          ruleContent: rule.content.substring(0, 50) + '...',
          examplesCount: rule.examples.length,
        });

        for (const exampleInput of rule.examples) {
          try {
            // Validate language parameter (following CreateRuleExampleUsecase pattern)
            if (!exampleInput.language) {
              this.logger.warn('Example missing language, skipping', {
                ruleContent: rule.content.substring(0, 50) + '...',
              });
              continue;
            }

            const ruleExample: RuleExample = {
              id: createRuleExampleId(uuidv4()),
              ruleId: createRuleId(uuidv4()), // Temporary ID, will be replaced by StandardVersionService
              lang: exampleInput.language,
              positive: exampleInput.positive || '',
              negative: exampleInput.negative || '',
            };

            ruleExamples.push(ruleExample);
            this.logger.debug('Rule example processed successfully', {
              exampleId: ruleExample.id,
              language: ruleExample.lang,
            });
          } catch (exampleError) {
            // Log failure but continue (as per requirement: "Just log failures")
            this.logger.error('Failed to process rule example, skipping', {
              ruleContent: rule.content.substring(0, 50) + '...',
              language: exampleInput.language,
              error:
                exampleError instanceof Error
                  ? exampleError.message
                  : String(exampleError),
            });
          }
        }
      }

      processedRules.push({
        content: rule.content,
        examples: ruleExamples,
      });
    }

    this.logger.info('Rules processing completed', {
      rulesCount: processedRules.length,
      totalExamples: processedRules.reduce(
        (sum, r) => sum + r.examples.length,
        0,
      ),
    });

    return processedRules;
  }

  private async generateStandardVersionSummary(
    standard: Standard,
    name: string,
    standardSlug: string,
    description: string,
    initialVersion: number,
    scope: string | null,
    rules: { content: string; examples: RuleExample[] }[],
  ) {
    // Generate summary for the standard version (reusing logic from CreateStandardUsecase)
    let summary: string | null = null;
    try {
      this.logger.info('Generating summary for standard version', {
        rulesCount: rules.length,
      });

      summary = await this.standardSummaryService.createStandardSummary(
        {
          standardId: standard.id,
          name,
          slug: standardSlug,
          description,
          version: initialVersion,
          summary: null,
          scope,
        },
        rules,
      );
      this.logger.info('Summary generated successfully', {
        summaryLength: summary.length,
      });
    } catch (summaryError) {
      if (summaryError instanceof AiNotConfigured) {
        this.logger.warn(
          'AI service not configured - proceeding without summary',
          {
            error: summaryError.message,
          },
        );
      } else {
        const errorMessage =
          summaryError instanceof Error
            ? summaryError.message
            : String(summaryError);
        this.logger.error(
          'Failed to generate summary, proceeding without summary',
          {
            error: errorMessage,
          },
        );
      }
    }
    return summary;
  }

  private async assessRulesDetections(
    standardVersionId: StandardVersionId,
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<void> {
    this.logger.info(
      'Starting detection program validation for created rules',
      {
        standardVersionId,
      },
    );

    // Query the created rules from the repository
    const createdRules =
      await this.ruleRepository.findByStandardVersionId(standardVersionId);

    this.logger.debug('Retrieved created rules from repository', {
      createdRulesCount: createdRules.length,
    });

    // Fetch examples for all rules in parallel
    const rulesWithExamples = await Promise.all(
      createdRules.map(async (rule) => {
        const examples = await this.ruleExampleRepository.findByRuleId(rule.id);
        return { rule, examples };
      }),
    );

    // Build validation tasks for all rule-language pairs
    const validationPromises: Promise<void>[] = [];

    for (const { rule, examples } of rulesWithExamples) {
      // Skip rules without examples
      if (!examples || examples.length === 0) {
        this.logger.debug('Skipping rule without examples', {
          ruleId: rule.id,
        });
        continue;
      }

      // Collect unique languages from examples
      const uniqueLanguages = new Set<ProgrammingLanguage>();
      for (const example of examples) {
        uniqueLanguages.add(example.lang);
      }

      this.logger.debug('Collected unique languages for rule', {
        ruleId: rule.id,
        languagesCount: uniqueLanguages.size,
        languages: Array.from(uniqueLanguages),
      });

      // Create validation promises for each language
      for (const language of uniqueLanguages) {
        validationPromises.push(
          this.validateDetectionProgramsForRuleAndLanguage(
            rule.id,
            language,
            organizationId,
            userId,
          ),
        );
      }
    }

    this.logger.info('Running detection program validations in parallel', {
      validationCount: validationPromises.length,
    });

    // Run all validations in parallel
    const results = await Promise.allSettled(validationPromises);

    // Log any failures
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      this.logger.warn('Some detection program validations failed', {
        totalValidations: results.length,
        failedCount: failures.length,
      });
    } else {
      this.logger.info('All detection program validations completed', {
        totalValidations: results.length,
      });
    }
  }

  private async validateDetectionProgramsForRuleAndLanguage(
    ruleId: RuleId,
    language: ProgrammingLanguage,
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<void> {
    if (!this._linterAdapter) {
      this.logger.warn(
        'Linter adapter not available, skipping detection program validation',
        { ruleId, language },
      );
      return;
    }

    this.logger.info('Validating detection programs for rule and language', {
      ruleId,
      language,
    });

    try {
      await this._linterAdapter.updateRuleDetectionAssessmentAfterUpdate({
        ruleId,
        language,
        organizationId,
        userId,
      });
      this.logger.debug('Detection program validation triggered', {
        ruleId,
        language,
      });
    } catch (error) {
      this.logger.error('Failed to update detection program status', {
        ruleId,
        language,
        organizationId,
        error: getErrorMessage(error),
      });
    }
  }
}
