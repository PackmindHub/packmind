import { PackmindLogger, LogLevel } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  ISpacesPort,
  SpaceId,
  OrganizationId,
  UserId,
} from '@packmind/types';
import {
  IProcessStandardChanges,
  ProcessStandardChangesCommand,
  ProcessStandardChangesResult,
  StandardChange,
} from '../../../domain/useCases/IProcessStandardChanges';
import { AddRuleToStandardUsecase } from '../addRuleToStandard/addRuleToStandard.usecase';
import { StandardService } from '../../services/StandardService';

const origin = 'ProcessStandardChangesUsecase';

export class ProcessStandardChangesUsecase
  extends AbstractMemberUseCase<
    ProcessStandardChangesCommand,
    ProcessStandardChangesResult
  >
  implements IProcessStandardChanges
{
  constructor(
    accountsAdapter: IAccountsPort,
    private readonly standardService: StandardService,
    private readonly addRuleToStandardUsecase: AddRuleToStandardUsecase,
    private readonly spacesPort: ISpacesPort | null,
    logger: PackmindLogger = new PackmindLogger(origin, LogLevel.DEBUG),
  ) {
    super(accountsAdapter, logger);
    this.logger.info('ProcessStandardChangesUsecase initialized');
  }

  async executeForMembers(
    command: ProcessStandardChangesCommand & MemberContext,
  ): Promise<ProcessStandardChangesResult> {
    this.logger.info('Processing standard changes', {
      changesCount: command.changes.length,
      organizationId: command.organizationId,
      userId: command.userId,
    });

    const result: ProcessStandardChangesResult = {
      succeeded: [],
      failed: [],
    };

    // Get the Global space for this organization
    let globalSpaceId: SpaceId;
    try {
      globalSpaceId = await this.resolveGlobalSpace(command.organizationId);
    } catch (error) {
      this.logger.error('Failed to resolve Global space', {
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      // If we can't get the space, all changes fail
      for (const change of command.changes) {
        result.failed.push({
          standardSlug: change.standard,
          rule: change.newRule,
          error: 'Failed to resolve Global space for organization',
        });
      }
      return result;
    }

    // Process each change
    for (const change of command.changes) {
      try {
        await this.processChange(
          change,
          command.organizationId,
          command.userId,
          globalSpaceId,
          result,
        );
      } catch (error) {
        // Errors are already logged and added to result.failed in processChange
        // Continue with next change
        this.logger.debug('Continuing to next change after error', {
          standardSlug: change.standard,
        });
      }
    }

    this.logger.info('Standard changes processing completed', {
      totalChanges: command.changes.length,
      succeeded: result.succeeded.length,
      failed: result.failed.length,
    });

    return result;
  }

  private async resolveGlobalSpace(
    organizationId: OrganizationId,
  ): Promise<SpaceId> {
    if (!this.spacesPort) {
      this.logger.error('SpacesPort not available');
      throw new Error('SpacesPort not available');
    }

    const spaces = await this.spacesPort.listSpacesByOrganization(
      organizationId,
    );

    if (!spaces || spaces.length === 0) {
      this.logger.error('No spaces found for organization', {
        organizationId,
      });
      throw new Error(
        'No spaces found in organization. Please create a space first.',
      );
    }

    const globalSpace = spaces[0];
    this.logger.debug('Resolved Global space', {
      spaceId: globalSpace.id,
      spaceName: globalSpace.name,
      organizationId,
    });

    return globalSpace.id;
  }

  private async processChange(
    change: StandardChange,
    organizationId: OrganizationId,
    userId: UserId,
    spaceId: SpaceId,
    result: ProcessStandardChangesResult,
  ): Promise<void> {
    this.logger.debug('Processing change', {
      operation: change.operation,
      standard: change.standard,
      rule: change.newRule.substring(0, 50) + '...',
    });

    // Only process ADDED operations
    if (change.operation !== 'ADDED') {
      this.logger.info('Skipping non-ADDED operation', {
        operation: change.operation,
        standard: change.standard,
      });
      return;
    }

    try {
      // Normalize slug to lowercase
      const normalizedSlug = change.standard.toLowerCase();

      // Check if standard exists
      const existingStandard = await this.standardService.findStandardBySlug(
        normalizedSlug,
        organizationId,
      );

      if (!existingStandard) {
        const errorMessage = `Standard '${change.standard}' not found`;
        this.logger.warn('Standard not found, skipping change', {
          standardSlug: change.standard,
          normalizedSlug,
          organizationId,
        });
        result.failed.push({
          standardSlug: change.standard,
          rule: change.newRule,
          error: errorMessage,
        });
        return;
      }

      // Add rule to standard
      this.logger.info('Adding rule to standard', {
        standardSlug: change.standard,
        standardId: existingStandard.id,
        ruleContent: change.newRule.substring(0, 50) + '...',
      });

      const standardVersion = await this.addRuleToStandardUsecase.addRuleToStandard({
        standardSlug: normalizedSlug,
        ruleContent: change.newRule,
        organizationId,
        userId,
      });

      result.succeeded.push({
        standardSlug: change.standard,
        rule: change.newRule,
        standardVersion,
      });

      this.logger.info('Rule added successfully', {
        standardSlug: change.standard,
        standardVersionId: standardVersion.id,
        version: standardVersion.version,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to process change', {
        standardSlug: change.standard,
        operation: change.operation,
        error: errorMessage,
      });
      result.failed.push({
        standardSlug: change.standard,
        rule: change.newRule,
        error: errorMessage,
      });
    }
  }
}
