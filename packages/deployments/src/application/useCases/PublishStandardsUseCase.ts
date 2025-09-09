import { OrganizationId, PackmindLogger, UserId } from '@packmind/shared';
import { v4 as uuidv4 } from 'uuid';
import { StandardsHexa } from '@packmind/standards';
import { GitHexa, GitRepo, GitCommit } from '@packmind/git';
import { CodingAgentHexa, CodingAgents } from '@packmind/coding-agent';
import { IPublishStandards, PublishStandardsCommand } from '@packmind/shared';
import {
  StandardsDeployment,
  createStandardsDeploymentId,
} from '../../domain/entities/StandardsDeployment';
import { PrepareStandardsDeploymentCommand } from '@packmind/coding-agent';
import { IStandardsDeploymentRepository } from '../../domain/repositories/IStandardsDeploymentRepository';

const origin = 'PublishStandardsUseCase';

export class PublishStandardsUseCase implements IPublishStandards {
  constructor(
    private readonly standardsHexa: StandardsHexa,
    private readonly gitHexa: GitHexa,
    private readonly codingAgentHexa: CodingAgentHexa,
    private readonly standardsDeploymentRepository: IStandardsDeploymentRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: PublishStandardsCommand,
  ): Promise<StandardsDeployment> {
    this.logger.info('Publishing standards', {
      standardVersionIdsCount: command.standardVersionIds.length,
      gitRepoIdsCount: command.gitRepoIds.length,
      organizationId: command.organizationId,
    });

    const allGitRepos: GitRepo[] = [];
    const allGitCommits: GitCommit[] = [];
    const allStandardVersionsMap = new Map();

    // Process each git repository
    for (const gitRepoId of command.gitRepoIds) {
      this.logger.info('Processing repository', {
        gitRepoId,
        standardVersionIdsCount: command.standardVersionIds.length,
      });

      try {
        // Get the git repository
        const gitRepo = await this.gitHexa.getRepositoryById(gitRepoId);
        if (!gitRepo) {
          this.logger.error('Repository not found', { gitRepoId });
          throw new Error(`Repository with id ${gitRepoId} not found`);
        }

        this.logger.debug('Found repository', {
          gitRepoId,
          owner: gitRepo.owner,
          repo: gitRepo.repo,
        });

        // Get standard versions by IDs
        const standardVersions = await Promise.all(
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

        // Get previously deployed standard versions for this repository
        // This ensures we maintain all previously deployed standards in the index
        const previousStandardVersions =
          await this.standardsDeploymentRepository.findActiveStandardVersionsByRepository(
            command.organizationId as OrganizationId,
            gitRepo.id,
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

        // Prepare the deployment using CodingAgentHexa
        const prepareCommand: PrepareStandardsDeploymentCommand = {
          standardVersions: allStandardVersions,
          gitRepo,
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
        allGitRepos.push(gitRepo);
        allGitCommits.push(gitCommit);

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

        // Create individual deployment entry for the database
        const standardsDeployment: StandardsDeployment = {
          id: createStandardsDeploymentId(uuidv4()),
          standardVersions: allStandardVersions, // already cast as any above
          gitRepos: [gitRepo],
          gitCommits: [gitCommit],
          createdAt: new Date().toISOString(),
          authorId: command.userId as UserId,
          organizationId: command.organizationId as OrganizationId,
        };

        // Save the deployment to the database
        await this.standardsDeploymentRepository.add(standardsDeployment);

        this.logger.info('Created deployment entry', {
          standardsDeploymentId: standardsDeployment.id,
          gitRepoId,
        });
      } catch (error) {
        this.logger.error('Failed to process repository', {
          gitRepoId,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }

    // Convert map to array for final deployment
    const finalStandardVersions = Array.from(allStandardVersionsMap.values());

    // Create the combined StandardDeployment to return
    const deployment: StandardsDeployment = {
      id: createStandardsDeploymentId(uuidv4()),
      standardVersions: finalStandardVersions,
      gitRepos: allGitRepos,
      gitCommits: allGitCommits,
      createdAt: new Date().toISOString(),
      authorId: command.userId as UserId,
      organizationId: command.organizationId as OrganizationId,
    };

    this.logger.info('Successfully published standards', {
      standardVersionsCount: finalStandardVersions.length,
      gitRepoIdsCount: command.gitRepoIds.length,
      deploymentId: deployment.id,
      commitsCount: allGitCommits.length,
    });

    return deployment;
  }
}
