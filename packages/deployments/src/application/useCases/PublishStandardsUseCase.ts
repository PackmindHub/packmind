import {
  OrganizationId,
  PackmindLogger,
  UserId,
  DistributionStatus,
  Target,
  GitRepo,
  StandardVersion,
} from '@packmind/shared';
import { v4 as uuidv4 } from 'uuid';
import { StandardsHexa } from '@packmind/standards';
import { GitHexa } from '@packmind/git';
import { CodingAgentHexa, CodingAgents } from '@packmind/coding-agent';
import { IPublishStandards, PublishStandardsCommand } from '@packmind/shared';
import {
  StandardsDeployment,
  createStandardsDeploymentId,
} from '../../domain/entities/StandardsDeployment';
import { PrepareStandardsDeploymentCommand } from '@packmind/coding-agent';
import { IStandardsDeploymentRepository } from '../../domain/repositories/IStandardsDeploymentRepository';
import { TargetService } from '../services/TargetService';

const origin = 'PublishStandardsUseCase';

export class PublishStandardsUseCase implements IPublishStandards {
  constructor(
    private readonly standardsHexa: StandardsHexa,
    private readonly gitHexa: GitHexa,
    private readonly codingAgentHexa: CodingAgentHexa,
    private readonly standardsDeploymentRepository: IStandardsDeploymentRepository,
    private readonly targetService: TargetService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: PublishStandardsCommand,
  ): Promise<StandardsDeployment[]> {
    this.logger.info('Publishing standards', {
      standardVersionIdsCount: command.standardVersionIds.length,
      targetIdsCount: command.targetIds.length,
      organizationId: command.organizationId,
    });

    // Get repository for each target
    const targetRepositoryMap = new Map();
    for (const targetId of command.targetIds) {
      const { target, repository } =
        await this.targetService.getRepositoryByTargetId(targetId);
      targetRepositoryMap.set(targetId, { target, repository });
      this.logger.info('Repository found for target', {
        targetId,
        repositoryId: repository.id,
        owner: repository.owner,
        repo: repository.repo,
      });
    }

    const deployments: StandardsDeployment[] = [];
    const allStandardVersionsMap = new Map();

    // Process each target
    for (const targetId of command.targetIds) {
      const { target, repository: gitRepo } = targetRepositoryMap.get(targetId);

      this.logger.info('Processing target', {
        targetId,
        gitRepoId: gitRepo.id,
        standardVersionIdsCount: command.standardVersionIds.length,
      });

      // Get standard versions by IDs (declared outside try block for catch access)
      let standardVersions: StandardVersion[] = [];

      try {
        standardVersions = await Promise.all(
          command.standardVersionIds.map(async (standardVersionId) => {
            const standardVersion =
              await this.standardsHexa.getStandardVersionById(
                standardVersionId,
              );
            if (!standardVersion) {
              this.logger.error('Standard version not found', {
                standardVersionId,
              });
              throw new Error(
                `Standard version with id ${standardVersionId} not found`,
              );
            }
            return standardVersion;
          }),
        );

        this.logger.info('Retrieved standard versions', {
          count: standardVersions.length,
          standardVersions: standardVersions.map((sv) => ({
            id: sv.id,
            name: sv.name,
            slug: sv.slug,
            version: sv.version,
          })),
        });

        // Get previously deployed standard versions for this target
        // This ensures we maintain all previously deployed standards in the index
        const previousStandardVersions =
          await this.standardsDeploymentRepository.findActiveStandardVersionsByTarget(
            command.organizationId as OrganizationId,
            targetId,
          );

        this.logger.info('Found previously deployed standard versions', {
          count: previousStandardVersions.length,
        });

        // Combine current deployment with previous ones
        // Remove duplicates by standardId (keep the latest version)
        const standardVersionsMap = new Map();

        // Add previous versions first
        previousStandardVersions.forEach((sv) => {
          standardVersionsMap.set(sv.standardId, sv);
        });

        // Override with current deployment versions (these are newer)
        standardVersions.forEach((sv) => {
          standardVersionsMap.set(sv.standardId, sv);
        });

        const allStandardVersions = Array.from(standardVersionsMap.values());

        this.logger.info('Combined standard versions', {
          totalCount: allStandardVersions.length,
          newCount: standardVersions.length,
          previousCount: previousStandardVersions.length,
        });

        // We already have the target for this iteration
        const repositoryTargets = [target];

        // Prepare the deployment using CodingAgentHexa
        const prepareCommand: PrepareStandardsDeploymentCommand = {
          standardVersions: allStandardVersions,
          gitRepo,
          targets: repositoryTargets,
          codingAgents: [
            CodingAgents.packmind,
            CodingAgents.junie,
            CodingAgents.claude,
            CodingAgents.cursor,
            CodingAgents.copilot,
            CodingAgents.agents_md,
          ], // Deploy to Packmind, Junie, Claude Code, Cursor, GitHub Copilot, and AGENTS.md
        };

        const fileUpdates =
          await this.codingAgentHexa.prepareStandardsDeployment(prepareCommand);

        this.logger.info('Prepared file updates', {
          createOrUpdateCount: fileUpdates.createOrUpdate.length,
          deleteCount: fileUpdates.delete.length,
        });

        // Commit the changes to git
        const commitMessage = `[PACKMIND] Update standards files

- Updated ${standardVersions.length} standard(s)
- Total standards in repository: ${allStandardVersions.length}

Standards updated:
${standardVersions.map((sv) => `- ${sv.name} (${sv.slug}) v${sv.version}`).join('\n')}`;

        let gitCommit;
        try {
          gitCommit = await this.gitHexa.commitToGit(
            gitRepo,
            fileUpdates.createOrUpdate,
            commitMessage,
          );
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === 'NO_CHANGES_DETECTED'
          ) {
            this.logger.info('No changes detected, skipping this repository', {
              gitRepoId: gitRepo.id,
              standardVersionsCount: allStandardVersions.length,
            });
            continue; // Skip to next repository
          }
          throw error; // Re-throw other errors
        }

        this.logger.info('Committed changes', {
          commitId: gitCommit.id,
          commitSha: gitCommit.sha,
        });

        // Add to collections for combined deployment
        // Individual deployments are now created per target instead of collecting in arrays

        // Merge standard versions (avoid duplicates by standardId, keep latest version)
        for (const standardVersion of allStandardVersions) {
          const existingVersion = allStandardVersionsMap.get(
            standardVersion.standardId,
          );
          if (
            !existingVersion ||
            standardVersion.version > existingVersion.version
          ) {
            allStandardVersionsMap.set(
              standardVersion.standardId,
              standardVersion,
            );
          }
        }

        // Create individual deployment entry using clean model
        const standardsDeployment: StandardsDeployment = {
          id: createStandardsDeploymentId(uuidv4()),
          standardVersions: allStandardVersions, // already cast as any above
          createdAt: new Date().toISOString(),
          authorId: command.userId as UserId,
          organizationId: command.organizationId as OrganizationId,
          // Single target model fields
          gitCommit: gitCommit,
          target: target,
          status: DistributionStatus.success,
        };

        // Save the deployment to the database
        await this.standardsDeploymentRepository.add(standardsDeployment);

        // Add to deployments array for return
        deployments.push(standardsDeployment);

        this.logger.info('Created successful deployment entry', {
          standardsDeploymentId: standardsDeployment.id,
          targetId,
          gitRepoId: gitRepo.id,
          status: DistributionStatus.success,
          commitSha: gitCommit.sha,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error('Failed to process target', {
          targetId,
          gitRepoId: gitRepo.id,
          error: errorMessage,
        });

        await this.saveStandardDeploymentInFailure(
          command,
          target,
          deployments,
          gitRepo,
          errorMessage,
          standardVersions, // Pass the already-fetched standard versions (may be empty if fetch failed)
        );
      }
    }

    this.logger.info('Successfully published standards', {
      deploymentsCount: deployments.length,
      targetIdsCount: command.targetIds.length,
      successfulDeployments: deployments.filter(
        (d) => d.status === DistributionStatus.success,
      ).length,
      failedDeployments: deployments.filter(
        (d) => d.status === DistributionStatus.failure,
      ).length,
    });

    return deployments;
  }

  private async saveStandardDeploymentInFailure(
    command: PublishStandardsCommand,
    target: Target,
    deployments: StandardsDeployment[],
    gitRepo: GitRepo,
    errorMessage: string,
    standardVersions: StandardVersion[], // Reuse the already-fetched standard versions
  ) {
    // Create failure deployment record using clean model
    try {
      // If standardVersions is empty (fetch failed), try to fetch what was intended
      let versionsToRecord = standardVersions;
      if (standardVersions.length === 0) {
        this.logger.info(
          'No standard versions available, attempting to fetch intended versions for failure record',
          {
            standardVersionIdsCount: command.standardVersionIds.length,
          },
        );

        try {
          const fetchedVersions = await Promise.all(
            command.standardVersionIds.map(async (standardVersionId) => {
              const standardVersion =
                await this.standardsHexa.getStandardVersionById(
                  standardVersionId,
                );
              return standardVersion;
            }),
          );
          // Filter out null values and ensure type safety
          versionsToRecord = fetchedVersions.filter(
            (sv): sv is StandardVersion => sv !== null,
          );

          this.logger.info(
            'Successfully fetched intended versions for failure record',
            {
              count: versionsToRecord.length,
            },
          );
        } catch (fetchError) {
          this.logger.warn(
            'Could not fetch intended standard versions for failure record',
            {
              error:
                fetchError instanceof Error
                  ? fetchError.message
                  : String(fetchError),
            },
          );
          // Keep empty array if we can't fetch
          versionsToRecord = [];
        }
      }

      const failureDeployment: StandardsDeployment = {
        id: createStandardsDeploymentId(uuidv4()),
        standardVersions: versionsToRecord, // Use the versions (either passed or fetched)
        createdAt: new Date().toISOString(),
        authorId: command.userId as UserId,
        organizationId: command.organizationId as OrganizationId,
        gitCommit: undefined, // No commit created on failure
        target: target,
        status: DistributionStatus.failure,
        error: errorMessage,
      };

      await this.standardsDeploymentRepository.add(failureDeployment);

      // Add failure deployment to array for return
      deployments.push(failureDeployment);

      this.logger.info('Created failure deployment record', {
        deploymentId: failureDeployment.id,
        targetId: target.id,
        gitRepoId: gitRepo.id,
        status: DistributionStatus.failure,
        error: errorMessage,
      });
    } catch (saveError) {
      this.logger.error('Failed to save failure deployment record', {
        targetId: target.id,
        gitRepoId: gitRepo.id,
        saveError:
          saveError instanceof Error ? saveError.message : String(saveError),
      });
    }
  }
}
