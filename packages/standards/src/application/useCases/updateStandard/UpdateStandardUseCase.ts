import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  IAccountsPort,
  ISpacesPort,
  IUpdateStandardUseCase,
  RuleAddedEvent,
  RuleDeletedEvent,
  RuleExample,
  RuleId,
  StandardUpdatedEvent,
  UpdateStandardCommand,
  UpdateStandardResponse,
  createOrganizationId,
  createSpaceId,
  createStandardId,
  createStandardVersionId,
  createUserId,
} from '@packmind/types';
import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import { StandardService } from '../../services/StandardService';
import {
  CreateStandardVersionData,
  StandardVersionService,
} from '../../services/StandardVersionService';

const origin = 'UpdateStandardUseCase';

export class UpdateStandardUseCase
  extends AbstractSpaceMemberUseCase<
    UpdateStandardCommand,
    UpdateStandardResponse
  >
  implements IUpdateStandardUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsAdapter: IAccountsPort,
    private readonly standardService: StandardService,
    private readonly standardVersionService: StandardVersionService,
    private readonly ruleRepository: IRuleRepository,
    private readonly ruleExampleRepository: IRuleExampleRepository,
    private readonly eventEmitterService: PackmindEventEmitterService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsAdapter, logger);
    this.logger.info('UpdateStandardUseCase initialized');
  }

  async executeForSpaceMembers(
    command: UpdateStandardCommand & SpaceMemberContext,
  ): Promise<UpdateStandardResponse> {
    const {
      standardId,
      name,
      description,
      rules,
      organizationId,
      userId,
      scope,
      spaceId,
      source = 'ui',
    } = command;

    this.logger.info('Starting updateStandard process', {
      standardId,
      name,
      organizationId,
      userId,
      spaceId,
      rulesCount: rules.length,
      scope,
    });

    try {
      const space = await this.spacesPort.getSpaceById(spaceId);
      if (!space) {
        this.logger.error('Space not found', { spaceId });
        throw new Error(`Space with id ${spaceId} not found`);
      }
      if (space.organizationId !== organizationId) {
        this.logger.error('Space does not belong to organization', {
          spaceId,
          spaceOrganizationId: space.organizationId,
          requestOrganizationId: organizationId,
        });
        throw new Error(
          `Space ${spaceId} does not belong to organization ${organizationId}`,
        );
      }

      const existingStandard =
        await this.standardService.getStandardById(standardId);
      if (!existingStandard) {
        this.logger.error('Standard not found for update', { standardId });
        throw new Error(`Standard with id ${standardId} not found`);
      }

      if (existingStandard.spaceId !== spaceId) {
        this.logger.error('Standard does not belong to space', {
          standardId,
          standardSpaceId: existingStandard.spaceId,
          requestSpaceId: spaceId,
        });
        throw new Error(
          `Standard ${standardId} does not belong to space ${spaceId}`,
        );
      }

      this.logger.debug('Found existing standard', {
        standardId,
        currentVersion: existingStandard.version,
        existingName: existingStandard.name,
      });

      const latestVersion =
        await this.standardVersionService.getLatestStandardVersion(standardId);

      if (!latestVersion) {
        this.logger.error('No versions found for standard', { standardId });
        throw new Error(`No versions found for standard ${standardId}`);
      }

      const existingRules = await this.ruleRepository.findByStandardVersionId(
        latestVersion.id,
      );

      const contentHasChanged = this.hasContentChanged(
        {
          name: latestVersion.name,
          description: latestVersion.description,
          scope: latestVersion.scope,
          rules: existingRules.map((rule) => ({ content: rule.content })),
        },
        { name, description, scope, rules },
      );

      if (!contentHasChanged) {
        this.logger.info('Content is identical, no update needed', {
          standardId,
          name,
        });
        return { standard: existingStandard };
      }

      this.logger.info('Content has changed, creating new version', {
        standardId,
        currentVersion: existingStandard.version,
      });

      // Always preserve the original slug when updating a standard
      const standardSlug = existingStandard.slug;
      this.logger.debug('Preserving original slug for updated standard', {
        slug: standardSlug,
        preservedOriginalSlug: true,
      });

      const nextVersion = existingStandard.version + 1;
      this.logger.debug('Incrementing version number', {
        currentVersion: existingStandard.version,
        nextVersion,
      });

      const brandedUserId = createUserId(userId);
      const brandedOrganizationId = createOrganizationId(organizationId);

      const updatedStandard = await this.standardService.updateStandard(
        standardId,
        {
          name,
          description,
          slug: standardSlug,
          version: nextVersion,
          gitCommit: undefined,
          userId: brandedUserId,
          scope,
        },
      );

      const existingRulesById = new Map(existingRules.map((r) => [r.id, r]));
      const rulesWithExamples: Array<{
        content: string;
        examples: RuleExample[];
        oldRuleId?: RuleId;
      }> = [];
      for (const r of rules) {
        const persisted = existingRulesById.get(r.id);
        if (persisted) {
          const examples = await this.ruleExampleRepository.findByRuleId(
            persisted.id,
          );
          rulesWithExamples.push({
            content: r.content,
            examples,
            oldRuleId: persisted.id,
          });
        } else {
          rulesWithExamples.push({ content: r.content, examples: [] });
        }
      }

      const standardVersionData: CreateStandardVersionData = {
        standardId,
        name,
        slug: standardSlug,
        description,
        version: nextVersion,
        rules: rulesWithExamples,
        scope,
        userId: brandedUserId,
        organizationId: brandedOrganizationId,
      };

      const newStandardVersion =
        await this.standardVersionService.addStandardVersion(
          standardVersionData,
        );

      this.logger.info('Standard updated successfully', {
        standardId,
        newVersion: nextVersion,
        versionId: newStandardVersion.id,
        rulesCount: rules.length,
      });

      this.logger.info('UpdateStandard process completed successfully', {
        standardId,
        versionId: newStandardVersion.id,
        name,
        organizationId,
        userId,
        rulesCount: rules.length,
      });

      const event = new StandardUpdatedEvent({
        standardId: createStandardId(standardId),
        spaceId: createSpaceId(spaceId),
        organizationId: brandedOrganizationId,
        userId: brandedUserId,
        newVersion: nextVersion,
        source,
      });
      const hasListeners = this.eventEmitterService.emit(event);
      this.logger.info('StandardUpdatedEvent emitted', {
        eventName: event.name,
        hasListeners,
        standardId,
        newVersion: nextVersion,
      });

      const ruleChanges = this.detectRuleChanges(existingRules, rules);
      const brandedStandardId = createStandardId(standardId);
      const brandedStandardVersionId = createStandardVersionId(
        newStandardVersion.id,
      );

      for (let i = 0; i < ruleChanges.deleted.length; i++) {
        this.eventEmitterService.emit(
          new RuleDeletedEvent({
            standardId: brandedStandardId,
            standardVersionId: brandedStandardVersionId,
            organizationId: brandedOrganizationId,
            userId: brandedUserId,
            newVersion: nextVersion,
            source,
          }),
        );
      }

      for (let i = 0; i < ruleChanges.added.length; i++) {
        this.eventEmitterService.emit(
          new RuleAddedEvent({
            standardId: brandedStandardId,
            standardVersionId: brandedStandardVersionId,
            organizationId: brandedOrganizationId,
            userId: brandedUserId,
            newVersion: nextVersion,
            source,
          }),
        );
      }

      if (ruleChanges.deleted.length > 0 || ruleChanges.added.length > 0) {
        this.logger.info('Rule change events emitted', {
          standardId,
          deletedCount: ruleChanges.deleted.length,
          addedCount: ruleChanges.added.length,
        });
      }

      return { standard: updatedStandard };
    } catch (error) {
      this.logger.error('Failed to update standard', {
        standardId,
        name,
        organizationId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private hasContentChanged(
    existing: {
      name: string;
      description: string;
      scope: string | null;
      rules: Array<{ content: string }>;
    },
    updated: {
      name: string;
      description: string;
      scope: string | null;
      rules: Array<{ content: string }>;
    },
  ): boolean {
    if (existing.name !== updated.name) {
      this.logger.debug('Name has changed', {
        existingName: existing.name,
        updatedName: updated.name,
      });
      return true;
    }

    if (existing.description !== updated.description) {
      this.logger.debug('Description has changed');
      return true;
    }

    if (existing.scope !== updated.scope) {
      this.logger.debug('Scope has changed', {
        existingScope: existing.scope,
        updatedScope: updated.scope,
      });
      return true;
    }

    if (existing.rules.length !== updated.rules.length) {
      this.logger.debug('Rules count has changed', {
        existingCount: existing.rules.length,
        updatedCount: updated.rules.length,
      });
      return true;
    }

    // Compared in sorted order: reordering rules alone is not a content change.
    const existingRulesSorted = [...existing.rules].sort((a, b) =>
      a.content.localeCompare(b.content),
    );
    const updatedRulesSorted = [...updated.rules].sort((a, b) =>
      a.content.localeCompare(b.content),
    );

    for (let i = 0; i < existingRulesSorted.length; i++) {
      if (existingRulesSorted[i].content !== updatedRulesSorted[i].content) {
        this.logger.debug('Rule content has changed', {
          ruleIndex: i,
          existingContent: existingRulesSorted[i].content,
          updatedContent: updatedRulesSorted[i].content,
        });
        return true;
      }
    }

    this.logger.debug('No content changes detected');
    return false;
  }

  private detectRuleChanges(
    existingRules: Array<{ content: string }>,
    newRules: Array<{ content: string }>,
  ): { added: string[]; deleted: string[] } {
    const existingContents = new Set(existingRules.map((r) => r.content));
    const newContents = new Set(newRules.map((r) => r.content));

    const added: string[] = [];
    const deleted: string[] = [];

    for (const content of newContents) {
      if (!existingContents.has(content)) {
        added.push(content);
      }
    }

    for (const content of existingContents) {
      if (!newContents.has(content)) {
        deleted.push(content);
      }
    }

    return { added, deleted };
  }
}
