import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  GetStandardRulesDetectionStatusCommand,
  GetStandardRulesDetectionStatusResponse,
  IAccountsPort,
  IComputeRuleLanguageDetectionStatusUseCase,
  IStandardsPort,
  ProgrammingLanguage,
  RuleDetectionStatusSummary,
  RuleLanguageStatus,
} from '@packmind/types';
import { IActiveDetectionProgramRepository } from '../../../domain/repositories/IActiveDetectionProgramRepository';

const origin = 'GetStandardRulesDetectionStatusUseCase';

export class GetStandardRulesDetectionStatusUseCase extends AbstractMemberUseCase<
  GetStandardRulesDetectionStatusCommand,
  GetStandardRulesDetectionStatusResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly standardsAdapter: IStandardsPort,
    private readonly computeRuleLanguageDetectionStatusUseCase: IComputeRuleLanguageDetectionStatusUseCase,
    private readonly activeDetectionProgramRepository: IActiveDetectionProgramRepository,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: GetStandardRulesDetectionStatusCommand & MemberContext,
  ): Promise<GetStandardRulesDetectionStatusResponse> {
    this.logger.info('Getting standard rules detection status', {
      standardId: command.standardId,
      organizationId: command.organizationId,
      userId: command.userId,
    });

    try {
      // Get all rules for the latest version of this standard
      const rules = await this.standardsAdapter.getLatestRulesByStandardId(
        command.standardId,
      );

      this.logger.info('Retrieved rules for standard', {
        standardId: command.standardId,
        rulesCount: rules.length,
      });

      // For each rule, get the detection status for all languages
      const rulesStatusPromises = rules.map(async (rule) => {
        // Get rule examples to determine available languages
        const ruleExamples = await this.standardsAdapter.getRuleCodeExamples(
          rule.id,
        );

        // Extract unique languages from examples
        const languagesSet = new Set<ProgrammingLanguage>();
        for (const example of ruleExamples) {
          languagesSet.add(example.lang);
        }

        const languages = Array.from(languagesSet);

        // Compute detection status for each language in parallel
        const languageStatusPromises = languages.map(async (language) => {
          const statusResponse =
            await this.computeRuleLanguageDetectionStatusUseCase.execute({
              ruleId: rule.id,
              language,
            });

          const languageStatus: RuleLanguageStatus = {
            language,
            status: statusResponse.status,
          };

          return languageStatus;
        });

        const languageStatuses = await Promise.all(languageStatusPromises);

        const activeDetectionPrograms =
          await this.activeDetectionProgramRepository.findByRuleId(rule.id);

        const adpByLanguage = new Map(
          activeDetectionPrograms.map((adp) => [adp.language, adp]),
        );

        const enrichedLanguageStatuses: RuleLanguageStatus[] =
          languageStatuses.map((ls) => {
            const adp = adpByLanguage.get(ls.language);
            if (adp) {
              return {
                ...ls,
                severity: adp.severity,
                activeDetectionProgramId: adp.id,
              };
            }
            return ls;
          });

        const ruleSummary: RuleDetectionStatusSummary = {
          ruleId: rule.id,
          languages: enrichedLanguageStatuses,
        };

        return ruleSummary;
      });

      const rulesSummaries = await Promise.all(rulesStatusPromises);

      this.logger.info('Successfully computed detection status for all rules', {
        standardId: command.standardId,
        rulesCount: rulesSummaries.length,
      });

      return { rules: rulesSummaries };
    } catch (error) {
      this.logger.error('Failed to get standard rules detection status', {
        standardId: command.standardId,
        organizationId: command.organizationId,
        userId: command.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
