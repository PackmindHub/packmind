import { PackmindLogger } from '@packmind/logger';
import {
  OrganizationId,
  RuleId,
  StandardId,
  StandardVersion,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { StandardService } from '../../services/StandardService';
import {
  CreateStandardVersionData,
  StandardVersionService,
} from '../../services/StandardVersionService';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';

const origin = 'DeleteStandardRuleUsecase';

export class DeleteStandardRuleUsecase {
  constructor(
    private readonly standardService: StandardService,
    private readonly standardVersionService: StandardVersionService,
    private readonly ruleRepository: IRuleRepository,
    private readonly ruleExampleRepository: IRuleExampleRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('DeleteStandardRuleUsecase initialized');
  }

  async deleteStandardRule(params: {
    standardId: StandardId;
    ruleId: RuleId;
    organizationId: OrganizationId;
    userId: string;
  }): Promise<StandardVersion> {
    const { standardId, ruleId, organizationId, userId } = params;

    this.logger.info('Deleting standard rule', {
      standardId,
      ruleId,
      organizationId,
      userId,
    });

    try {
      const existingStandard =
        await this.standardService.getStandardById(standardId);
      if (!existingStandard) {
        this.logger.error('Standard not found', { standardId });
        throw new Error(`Standard with id ${standardId} not found`);
      }

      const latestVersion =
        await this.standardVersionService.getLatestStandardVersion(standardId);
      if (!latestVersion) {
        this.logger.error('No versions found for standard', { standardId });
        throw new Error(`No versions found for standard ${standardId}`);
      }

      // Verify the rule exists and belongs to this standard version
      const ruleToDelete = await this.ruleRepository.findById(ruleId);
      if (!ruleToDelete) {
        this.logger.error('Rule not found', { ruleId });
        throw new Error(`Rule with id ${ruleId} not found`);
      }

      if (ruleToDelete.standardVersionId !== latestVersion.id) {
        this.logger.error('Rule does not belong to latest version', {
          ruleId,
          ruleVersionId: ruleToDelete.standardVersionId,
          latestVersionId: latestVersion.id,
        });
        throw new Error(
          `Rule ${ruleId} does not belong to the latest version of standard ${standardId}`,
        );
      }

      // Get all existing rules except the one to delete
      const existingRules = await this.ruleRepository.findByStandardVersionId(
        latestVersion.id,
      );
      const rulesToKeep = existingRules.filter((rule) => rule.id !== ruleId);

      // Build rules with their examples
      const rulesWithExamples = await Promise.all(
        rulesToKeep.map(async (rule) => {
          const examples = await this.ruleExampleRepository.findByRuleId(
            rule.id,
          );
          return {
            content: rule.content,
            examples,
            oldRuleId: rule.id,
          };
        }),
      );

      const nextVersion = existingStandard.version + 1;
      const brandedUserId = createUserId(userId);
      const brandedOrganizationId = createOrganizationId(organizationId);

      await this.standardService.updateStandard(standardId, {
        name: latestVersion.name,
        description: latestVersion.description,
        slug: existingStandard.slug,
        version: nextVersion,
        gitCommit: undefined,
        userId: brandedUserId,
        scope: latestVersion.scope,
      });

      const versionData: CreateStandardVersionData = {
        standardId,
        name: latestVersion.name,
        slug: existingStandard.slug,
        description: latestVersion.description,
        version: nextVersion,
        rules: rulesWithExamples,
        scope: latestVersion.scope,
        userId: brandedUserId,
        organizationId: brandedOrganizationId,
      };

      const newVersion =
        await this.standardVersionService.addStandardVersion(versionData);

      this.logger.info('Standard rule deleted successfully', {
        standardId,
        ruleId,
        newVersion: nextVersion,
        versionId: newVersion.id,
        remainingRulesCount: rulesToKeep.length,
      });

      return newVersion;
    } catch (error) {
      this.logger.error('Failed to delete standard rule', {
        standardId,
        ruleId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
