import { PackmindLogger } from '@packmind/logger';
import {
  OrganizationId,
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

const origin = 'UpdateStandardNameUsecase';

export class UpdateStandardNameUsecase {
  constructor(
    private readonly standardService: StandardService,
    private readonly standardVersionService: StandardVersionService,
    private readonly ruleRepository: IRuleRepository,
    private readonly ruleExampleRepository: IRuleExampleRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('UpdateStandardNameUsecase initialized');
  }

  async updateStandardName(params: {
    standardId: StandardId;
    newName: string;
    organizationId: OrganizationId;
    userId: string;
  }): Promise<StandardVersion> {
    const { standardId, newName, organizationId, userId } = params;

    this.logger.info('Updating standard name', {
      standardId,
      newName,
      organizationId,
      userId,
    });

    try {
      // Get the existing standard
      const existingStandard =
        await this.standardService.getStandardById(standardId);
      if (!existingStandard) {
        this.logger.error('Standard not found', { standardId });
        throw new Error(`Standard with id ${standardId} not found`);
      }

      // Get the latest version
      const latestVersion =
        await this.standardVersionService.getLatestStandardVersion(standardId);
      if (!latestVersion) {
        this.logger.error('No versions found for standard', { standardId });
        throw new Error(`No versions found for standard ${standardId}`);
      }

      // Check if name actually changed
      if (latestVersion.name === newName) {
        this.logger.info('Name unchanged, returning existing version', {
          standardId,
          name: newName,
        });
        return latestVersion;
      }

      // Get existing rules to preserve them
      const existingRules = await this.ruleRepository.findByStandardVersionId(
        latestVersion.id,
      );

      // Build rules with their examples
      const rulesWithExamples = await Promise.all(
        existingRules.map(async (rule) => {
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

      // Increment version
      const nextVersion = existingStandard.version + 1;

      // Update standard entity
      const brandedUserId = createUserId(userId);
      const brandedOrganizationId = createOrganizationId(organizationId);

      await this.standardService.updateStandard(standardId, {
        name: newName,
        description: latestVersion.description,
        slug: existingStandard.slug,
        version: nextVersion,
        gitCommit: undefined,
        userId: brandedUserId,
        scope: latestVersion.scope,
      });

      // Create new version
      const versionData: CreateStandardVersionData = {
        standardId,
        name: newName,
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

      this.logger.info('Standard name updated successfully', {
        standardId,
        newName,
        newVersion: nextVersion,
        versionId: newVersion.id,
      });

      return newVersion;
    } catch (error) {
      this.logger.error('Failed to update standard name', {
        standardId,
        newName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
