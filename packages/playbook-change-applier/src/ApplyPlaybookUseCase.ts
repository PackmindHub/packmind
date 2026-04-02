import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import { stringify as stringifyYaml } from 'yaml';
import { v4 as uuidv4 } from 'uuid';
import {
  ApplyPlaybookCommand,
  ApplyPlaybookProposalItem,
  ApplyPlaybookResponse,
  ChangeProposal,
  ChangeProposalCaptureMode,
  ChangeProposalStatus,
  ChangeProposalType,
  DiffService,
  IAccountsPort,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  NewCommandPayload,
  NewSkillPayload,
  NewStandardPayload,
  RecipeId,
  RecipeVersion,
  SkillId,
  SkillVersionWithFiles,
  StandardId,
  StandardVersion,
  StandardVersionId,
  RecipeVersionId,
  SkillVersionId,
  ApplierObjectVersions,
  createChangeProposalId,
  createOrganizationId,
  createRecipeId,
  createSkillId,
  createStandardId,
  createUserId,
  getItemTypeFromChangeProposalType,
  UploadSkillFileInput,
  CAMEL_TO_YAML_KEY,
  camelToKebab,
  sortAdditionalPropertiesKeys,
} from '@packmind/types';
import { IChangesProposalApplier } from './appliers/IChangesProposalApplier';
import { StandardChangesApplier } from './appliers/StandardChangesApplier';
import { CommandChangesApplier } from './appliers/CommandChangesApplier';
import { SkillChangesApplier } from './appliers/SkillChangesApplier';

const origin = 'ApplyPlaybookUseCase';

const UNSUPPORTED_TYPES = new Set<ChangeProposalType>([
  ChangeProposalType.removeStandard,
  ChangeProposalType.removeCommand,
  ChangeProposalType.removeSkill,
  ChangeProposalType.deleteRule,
]);

const CREATION_TYPES = new Set<ChangeProposalType>([
  ChangeProposalType.createStandard,
  ChangeProposalType.createCommand,
  ChangeProposalType.createSkill,
]);

type RollbackEntry =
  | { action: 'created'; type: 'standard' | 'recipe' | 'skill'; id: string }
  | {
      action: 'updated';
      type: 'standard' | 'recipe' | 'skill';
      newVersionId: string;
    };

type ExecutionStep =
  | {
      kind: 'create';
      proposalIndex: number;
      proposal: ApplyPlaybookProposalItem;
    }
  | {
      kind: 'update';
      firstIndex: number;
      artefactId: string;
      itemType: 'standard' | 'command' | 'skill';
      proposals: ApplyPlaybookProposalItem[];
    };

export class ApplyPlaybookUseCase extends AbstractMemberUseCase<
  ApplyPlaybookCommand,
  ApplyPlaybookResponse
> {
  private readonly diffService = new DiffService();

  constructor(
    accountsPort: IAccountsPort,
    private readonly skillsPort: ISkillsPort,
    private readonly standardsPort: IStandardsPort,
    private readonly recipesPort: IRecipesPort,
    private readonly spacesPort: ISpacesPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: ApplyPlaybookCommand & MemberContext,
  ): Promise<ApplyPlaybookResponse> {
    const { proposals, userId, organizationId, directUpdate } = command;

    const validationError = await this.validateSpaces(
      proposals,
      organizationId,
    );
    if (validationError) {
      return validationError;
    }

    const typeValidationError = this.validateProposalTypes(proposals);
    if (typeValidationError) {
      return typeValidationError;
    }

    const steps = this.buildExecutionPlan(proposals);
    const rollbackEntries: RollbackEntry[] = [];
    const createdIds: {
      standards: Array<{ id: StandardId; slug: string }>;
      commands: Array<{ id: RecipeId; slug: string }>;
      skills: Array<{ id: SkillId; slug: string }>;
    } = { standards: [], commands: [], skills: [] };
    const updatedIds: {
      standards: StandardId[];
      commands: RecipeId[];
      skills: SkillId[];
    } = { standards: [], commands: [], skills: [] };

    for (const step of steps) {
      try {
        if (step.kind === 'create') {
          const artifact = await this.createArtifact(
            step.proposal,
            userId,
            organizationId,
            directUpdate,
          );
          rollbackEntries.push({
            action: 'created',
            type: artifact.type,
            id: artifact.id,
          });
          this.addToIdBucket(
            createdIds,
            artifact.type,
            artifact.id,
            artifact.slug,
          );
        } else {
          const result = await this.applyUpdateGroup(
            step,
            userId,
            organizationId,
          );
          rollbackEntries.push({
            action: 'updated',
            type: result.type,
            newVersionId: result.newVersionId,
          });
          this.addToUpdatedBucket(
            updatedIds,
            result.type === 'recipe' ? 'recipe' : result.type,
            step.artefactId,
          );
        }
      } catch (error) {
        const errorIndex =
          step.kind === 'create' ? step.proposalIndex : step.firstIndex;
        const errorType =
          step.kind === 'create' ? step.proposal.type : step.proposals[0].type;
        await this.rollback(rollbackEntries);
        return {
          success: false,
          error: {
            index: errorIndex,
            type: errorType,
            message: error instanceof Error ? error.message : String(error),
          },
        };
      }
    }

    return {
      success: true,
      created: createdIds,
      updated: updatedIds,
    };
  }

  private validateProposalTypes(
    proposals: ApplyPlaybookProposalItem[],
  ): ApplyPlaybookResponse | null {
    for (let i = 0; i < proposals.length; i++) {
      if (UNSUPPORTED_TYPES.has(proposals[i].type)) {
        return {
          success: false,
          error: {
            index: i,
            type: proposals[i].type,
            message: `Unsupported proposal type: ${proposals[i].type}`,
          },
        };
      }
    }
    return null;
  }

  private buildExecutionPlan(
    proposals: ApplyPlaybookProposalItem[],
  ): ExecutionStep[] {
    const steps: ExecutionStep[] = [];
    const updateGroups = new Map<
      string,
      {
        firstIndex: number;
        itemType: 'standard' | 'command' | 'skill';
        proposals: ApplyPlaybookProposalItem[];
      }
    >();

    for (let i = 0; i < proposals.length; i++) {
      const proposal = proposals[i];
      if (CREATION_TYPES.has(proposal.type)) {
        steps.push({ kind: 'create', proposalIndex: i, proposal });
      } else {
        const artefactId = proposal.artefactId as string;
        const existing = updateGroups.get(artefactId);
        if (existing) {
          existing.proposals.push(proposal);
        } else {
          updateGroups.set(artefactId, {
            firstIndex: i,
            itemType: getItemTypeFromChangeProposalType(proposal.type),
            proposals: [proposal],
          });
        }
      }
    }

    for (const [artefactId, group] of updateGroups) {
      steps.push({
        kind: 'update',
        firstIndex: group.firstIndex,
        artefactId,
        itemType: group.itemType,
        proposals: group.proposals,
      });
    }

    steps.sort((a, b) => {
      const indexA = a.kind === 'create' ? a.proposalIndex : a.firstIndex;
      const indexB = b.kind === 'create' ? b.proposalIndex : b.firstIndex;
      return indexA - indexB;
    });

    return steps;
  }

  private async applyUpdateGroup(
    step: Extract<ExecutionStep, { kind: 'update' }>,
    userId: string,
    organizationId: string,
  ): Promise<{ type: 'standard' | 'recipe' | 'skill'; newVersionId: string }> {
    const applier = this.getApplierForType(step.itemType);
    const currentVersion = await applier.getVersion(step.artefactId);

    const changeProposals = step.proposals.map((item) =>
      this.buildChangeProposal(item, userId),
    );

    const result = applier.applyChangeProposals(
      currentVersion,
      changeProposals,
    );

    const spaceId = step.proposals[0].spaceId;
    const brandedUserId = createUserId(userId);
    const brandedOrgId = createOrganizationId(organizationId);

    const savedVersion = await applier.saveNewVersion(
      result.version,
      brandedUserId,
      spaceId,
      brandedOrgId,
    );

    return {
      type: step.itemType === 'command' ? 'recipe' : step.itemType,
      newVersionId: this.getVersionId(savedVersion, step.itemType),
    };
  }

  private getApplierForType(
    itemType: 'standard' | 'command' | 'skill',
  ): IChangesProposalApplier<ApplierObjectVersions> {
    switch (itemType) {
      case 'standard':
        return new StandardChangesApplier(this.diffService, this.standardsPort);
      case 'command':
        return new CommandChangesApplier(this.diffService, this.recipesPort);
      case 'skill':
        return new SkillChangesApplier(this.diffService, this.skillsPort);
    }
  }

  private buildChangeProposal(
    item: ApplyPlaybookProposalItem,
    userId: string,
  ): ChangeProposal {
    return {
      id: createChangeProposalId(uuidv4()),
      type: item.type,
      artefactId: item.artefactId,
      artefactVersion: 0,
      spaceId: item.spaceId,
      targetId: item.targetId,
      payload: item.payload,
      captureMode: ChangeProposalCaptureMode.commit,
      message: '',
      status: ChangeProposalStatus.pending,
      decision: null,
      createdBy: createUserId(userId),
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ChangeProposal;
  }

  private getVersionId(
    version: ApplierObjectVersions,
    itemType: 'standard' | 'command' | 'skill',
  ): string {
    switch (itemType) {
      case 'standard':
        return (version as StandardVersion).id;
      case 'command':
        return (version as RecipeVersion).id;
      case 'skill':
        return (version as SkillVersionWithFiles).id;
    }
  }

  private addToIdBucket(
    bucket: {
      standards: Array<{ id: StandardId; slug: string }>;
      commands: Array<{ id: RecipeId; slug: string }>;
      skills: Array<{ id: SkillId; slug: string }>;
    },
    type: 'standard' | 'recipe' | 'skill',
    id: string,
    slug: string,
  ): void {
    switch (type) {
      case 'standard':
        bucket.standards.push({ id: id as StandardId, slug });
        break;
      case 'recipe':
        bucket.commands.push({ id: id as RecipeId, slug });
        break;
      case 'skill':
        bucket.skills.push({ id: id as SkillId, slug });
        break;
    }
  }

  private addToUpdatedBucket(
    bucket: {
      standards: StandardId[];
      commands: RecipeId[];
      skills: SkillId[];
    },
    type: 'standard' | 'recipe' | 'skill',
    id: string,
  ): void {
    switch (type) {
      case 'standard':
        bucket.standards.push(id as StandardId);
        break;
      case 'recipe':
        bucket.commands.push(id as RecipeId);
        break;
      case 'skill':
        bucket.skills.push(id as SkillId);
        break;
    }
  }

  private async validateSpaces(
    proposals: ApplyPlaybookProposalItem[],
    organizationId: string,
  ): Promise<ApplyPlaybookResponse | null> {
    const uniqueSpaceIds = [...new Set(proposals.map((p) => p.spaceId))];
    for (const spaceId of uniqueSpaceIds) {
      const space = await this.spacesPort.getSpaceById(spaceId);
      if (!space || space.organizationId !== organizationId) {
        const firstProposalIndex = proposals.findIndex(
          (p) => p.spaceId === spaceId,
        );
        return {
          success: false,
          error: {
            index: firstProposalIndex,
            type: proposals[firstProposalIndex].type,
            message: `Space ${spaceId} not found or does not belong to organization`,
          },
        };
      }
    }
    return null;
  }

  private async createArtifact(
    proposal: ApplyPlaybookProposalItem,
    userId: string,
    organizationId: string,
    directUpdate?: boolean,
  ): Promise<{
    type: 'standard' | 'recipe' | 'skill';
    id: string;
    slug: string;
  }> {
    const brandedUserId = createUserId(userId);
    const brandedOrgId = createOrganizationId(organizationId);
    const source = 'cli' as const;

    switch (proposal.type) {
      case ChangeProposalType.createSkill: {
        const payload = proposal.payload as NewSkillPayload;
        const result = await this.skillsPort.uploadSkill({
          userId,
          organizationId,
          source,
          spaceId: proposal.spaceId,
          files: this.buildSkillFiles(payload),
          ...(directUpdate !== undefined && { directUpdate }),
        });
        return {
          type: 'skill',
          id: createSkillId(result.skill.id),
          slug: result.skill.slug,
        };
      }
      case ChangeProposalType.createStandard: {
        const payload = proposal.payload as NewStandardPayload;
        const result = await this.standardsPort.createStandardWithExamples({
          organizationId: brandedOrgId,
          userId: brandedUserId,
          source,
          spaceId: proposal.spaceId,
          name: payload.name,
          description: payload.description,
          summary: null,
          scope: this.normalizeScope(payload.scope),
          rules: payload.rules.map((r) => ({ content: r.content })),
          ...(directUpdate !== undefined && { directUpdate }),
        });
        return {
          type: 'standard',
          id: createStandardId(result.id),
          slug: result.slug,
        };
      }
      case ChangeProposalType.createCommand: {
        const payload = proposal.payload as NewCommandPayload;
        const result = await this.recipesPort.captureRecipe({
          userId,
          organizationId,
          source,
          spaceId: proposal.spaceId,
          name: payload.name,
          content: payload.content,
          ...(directUpdate !== undefined && { directUpdate }),
        });
        return {
          type: 'recipe',
          id: createRecipeId(result.id),
          slug: result.slug,
        };
      }
      default:
        throw new Error(`Unsupported proposal type: ${proposal.type}`);
    }
  }

  private async rollback(entries: RollbackEntry[]): Promise<void> {
    for (const entry of [...entries].reverse()) {
      try {
        if (entry.action === 'created') {
          switch (entry.type) {
            case 'skill':
              await this.skillsPort.hardDeleteSkill(entry.id as SkillId);
              break;
            case 'standard':
              await this.standardsPort.hardDeleteStandard(
                entry.id as StandardId,
              );
              break;
            case 'recipe':
              await this.recipesPort.hardDeleteRecipe(entry.id as RecipeId);
              break;
          }
        } else {
          switch (entry.type) {
            case 'skill':
              await this.skillsPort.hardDeleteSkillVersion(
                entry.newVersionId as SkillVersionId,
              );
              break;
            case 'standard':
              await this.standardsPort.hardDeleteStandardVersion(
                entry.newVersionId as StandardVersionId,
              );
              break;
            case 'recipe':
              await this.recipesPort.hardDeleteRecipeVersion(
                entry.newVersionId as RecipeVersionId,
              );
              break;
          }
        }
      } catch (rollbackError) {
        this.logger.error('Failed to rollback during playbook apply', {
          action: entry.action,
          type: entry.type,
          error:
            rollbackError instanceof Error
              ? rollbackError.message
              : String(rollbackError),
        });
      }
    }
  }

  private buildSkillFiles(payload: NewSkillPayload): UploadSkillFileInput[] {
    const skillMdFile: UploadSkillFileInput = {
      path: 'SKILL.md',
      content: this.buildSkillMdContent(payload),
      permissions: payload.skillMdPermissions,
      isBase64: false,
    };

    const supportingFiles: UploadSkillFileInput[] =
      payload.files?.map((f) => ({
        path: f.path,
        content: f.content,
        permissions: f.permissions,
        isBase64: f.isBase64 ?? false,
      })) ?? [];

    return [skillMdFile, ...supportingFiles];
  }

  private buildSkillMdContent(payload: NewSkillPayload): string {
    const frontmatter: Record<string, unknown> = {
      name: payload.name,
      description: payload.description,
    };

    if (payload.license) {
      frontmatter['license'] = payload.license;
    }
    if (payload.compatibility) {
      frontmatter['compatibility'] = payload.compatibility;
    }
    if (payload.allowedTools) {
      frontmatter['allowed-tools'] = payload.allowedTools;
    }
    if (payload.metadata && Object.keys(payload.metadata).length > 0) {
      frontmatter['metadata'] = payload.metadata;
    }
    if (
      payload.additionalProperties &&
      Object.keys(payload.additionalProperties).length > 0
    ) {
      for (const [camelKey, value] of sortAdditionalPropertiesKeys(
        payload.additionalProperties,
      )) {
        const yamlKey = CAMEL_TO_YAML_KEY[camelKey] ?? camelToKebab(camelKey);
        frontmatter[yamlKey] = value;
      }
    }

    const yamlBlock = stringifyYaml(frontmatter).trimEnd();
    return `---\n${yamlBlock}\n---\n\n${payload.prompt}`;
  }

  private normalizeScope(scope: string[] | string | null): string | null {
    if (Array.isArray(scope)) return scope.join(', ');
    return scope;
  }
}
