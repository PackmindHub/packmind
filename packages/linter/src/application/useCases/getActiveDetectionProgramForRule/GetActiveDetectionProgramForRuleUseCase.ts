import { PackmindLogger } from '@packmind/logger';
import { OrganizationId } from '@packmind/types';
import { IStandardsPort } from '@packmind/types';
import { stringToProgrammingLanguage } from '@packmind/types';
import {
  GetActiveDetectionProgramForRuleCommand,
  GetActiveDetectionProgramForRuleResponse,
  IGetActiveDetectionProgramForRule,
  DetectionProgramWithSeverity,
} from '@packmind/types';
import { DetectionProgramService } from '../../services/DetectionProgramService';

const origin = 'GetActiveDetectionProgramForRuleUseCase';

export class GetActiveDetectionProgramForRuleUseCase implements IGetActiveDetectionProgramForRule {
  constructor(
    private readonly detectionProgramService: DetectionProgramService,
    private readonly standardsAdapter: IStandardsPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: GetActiveDetectionProgramForRuleCommand,
  ): Promise<GetActiveDetectionProgramForRuleResponse> {
    this.logger.info('Getting active detection programs for rule', {
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

      // Get all active detection programs with their current versions
      const activeProgramsWithPrograms =
        await this.detectionProgramService.findActiveByRuleIdWithPrograms(
          command.ruleId,
        );

      // Extract only active detection programs (current versions) with severity
      let programsWithSeverity: DetectionProgramWithSeverity[] =
        activeProgramsWithPrograms
          .filter((p) => p.detectionProgram !== null)
          .map((p) => ({
            ...p.detectionProgram!,
            language: p.detectionProgram!.language ?? p.language,
            severity: p.severity,
          }));

      // Filter by language if specified
      if (command.language) {
        const targetLanguage = stringToProgrammingLanguage(command.language);
        programsWithSeverity = programsWithSeverity.filter(
          (p) => p.language === targetLanguage,
        );
      }

      this.logger.info('Active detection programs retrieved successfully', {
        standardSlug: command.standardSlug,
        ruleId: command.ruleId,
        ruleContent: rule.content,
        language: command.language,
        activeCount: programsWithSeverity.length,
        scope: standard.scope,
      });

      return {
        programs: programsWithSeverity,
        ruleContent: rule.content,
        scope: standard.scope,
      };
    } catch (error) {
      this.logger.error('Failed to get active detection programs for rule', {
        standardSlug: command.standardSlug,
        ruleId: command.ruleId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
