import { LogLevel, PackmindLogger } from '@packmind/logger';
import { OrganizationId } from '@packmind/types';
import { IStandardsPort } from '@packmind/types';
import { stringToProgrammingLanguage } from '@packmind/types';
import {
  GetDraftDetectionProgramForRuleCommand,
  GetDraftDetectionProgramForRuleResponse,
  IGetDraftDetectionProgramForRule,
  DetectionProgramWithSeverity,
} from '@packmind/types';
import { DetectionProgramService } from '../../services/DetectionProgramService';

const origin = 'GetDraftDetectionProgramForRuleUseCase';

export class GetDraftDetectionProgramForRuleUseCase implements IGetDraftDetectionProgramForRule {
  constructor(
    private readonly detectionProgramService: DetectionProgramService,
    private readonly standardsAdapter: IStandardsPort,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {}

  async execute(
    command: GetDraftDetectionProgramForRuleCommand,
  ): Promise<GetDraftDetectionProgramForRuleResponse> {
    this.logger.info('Getting draft detection programs for rule', {
      standardSlug: command.standardSlug,
      ruleId: command.ruleId,
      organizationId: command.organizationId,
    });

    try {
      // Validate standard exists by slug
      const standard = await this.standardsAdapter.findStandardBySlug(
        command.standardSlug,
        command.organizationId as OrganizationId,
      );

      if (!standard) {
        this.logger.error('Standard not found by slug', {
          standardSlug: command.standardSlug,
          organizationId: command.organizationId,
        });
        throw new Error(
          `Standard with slug '${command.standardSlug}' not found`,
        );
      }

      // Validate rule exists
      const rule = await this.standardsAdapter.getRule(command.ruleId);
      if (!rule) {
        this.logger.error('Rule not found', {
          ruleId: command.ruleId,
        });
        throw new Error(`Rule with id '${command.ruleId}' not found`);
      }

      // Security check: Verify rule belongs to the latest version of the standard
      const latestRules =
        await this.standardsAdapter.getLatestRulesByStandardId(standard.id);
      const ruleExistsInStandard = latestRules.some(
        (r) => r.id === command.ruleId,
      );

      if (!ruleExistsInStandard) {
        this.logger.error('Rule does not belong to the standard', {
          ruleId: command.ruleId,
          standardSlug: command.standardSlug,
          standardId: standard.id,
        });
        throw new Error(
          `Rule '${command.ruleId}' does not belong to standard '${command.standardSlug}'`,
        );
      }

      // Get all active detection programs with their drafts
      const activeProgramsWithPrograms =
        await this.detectionProgramService.findActiveByRuleIdWithPrograms(
          command.ruleId,
        );

      // Filter and extract only draft detection programs with severity
      let draftProgramsWithSeverity: DetectionProgramWithSeverity[] =
        activeProgramsWithPrograms
          .filter((p) => p.draftDetectionProgram !== null)
          .map((p) => ({
            program: p.draftDetectionProgram!,
            severity: p.severity,
          }));

      // Filter by language if specified
      if (command.language) {
        const targetLanguage = stringToProgrammingLanguage(command.language);
        draftProgramsWithSeverity = draftProgramsWithSeverity.filter(
          (p) => p.program.language === targetLanguage,
        );
      }

      this.logger.info('Draft detection programs retrieved successfully', {
        standardSlug: command.standardSlug,
        ruleId: command.ruleId,
        ruleContent: rule.content,
        language: command.language,
        draftCount: draftProgramsWithSeverity.length,
        scope: standard.scope,
      });

      return {
        programs: draftProgramsWithSeverity,
        ruleContent: rule.content,
        scope: standard.scope,
      };
    } catch (error) {
      this.logger.error('Failed to get draft detection programs for rule', {
        standardSlug: command.standardSlug,
        ruleId: command.ruleId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
