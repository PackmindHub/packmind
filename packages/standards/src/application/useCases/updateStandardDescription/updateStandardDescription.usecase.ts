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

const origin = 'UpdateStandardDescriptionUsecase';

export class UpdateStandardDescriptionUsecase {
  constructor(
    private readonly standardService: StandardService,
    private readonly standardVersionService: StandardVersionService,
    private readonly ruleRepository: IRuleRepository,
    private readonly ruleExampleRepository: IRuleExampleRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('UpdateStandardDescriptionUsecase initialized');
  }

  async updateStandardDescription(params: {
    standardId: StandardId;
    newDescription: string;
    organizationId: OrganizationId;
    userId: string;
  }): Promise<StandardVersion> {
    const { standardId, newDescription, organizationId, userId } = params;

    this.logger.info('Updating standard description', {
      standardId,
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

      if (latestVersion.description === newDescription) {
        this.logger.info('Description unchanged, returning existing version', {
          standardId,
        });
        return latestVersion;
      }

      const existingRules = await this.ruleRepository.findByStandardVersionId(
        latestVersion.id,
      );

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

      const nextVersion = existingStandard.version + 1;
      const brandedUserId = createUserId(userId);
      const brandedOrganizationId = createOrganizationId(organizationId);

      await this.standardService.updateStandard(standardId, {
        name: latestVersion.name,
        description: newDescription,
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
        description: newDescription,
        version: nextVersion,
        rules: rulesWithExamples,
        scope: latestVersion.scope,
        userId: brandedUserId,
        organizationId: brandedOrganizationId,
      };

      const newVersion =
        await this.standardVersionService.addStandardVersion(versionData);

      this.logger.info('Standard description updated successfully', {
        standardId,
        newVersion: nextVersion,
        versionId: newVersion.id,
      });

      return newVersion;
    } catch (error) {
      this.logger.error('Failed to update standard description', {
        standardId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
