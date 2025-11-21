import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  createOrganizationId,
  createUserId,
  OrganizationId,
  UserId,
  IGitPort,
  Rule,
  StandardVersion,
  GitRepo,
  GitRepoId,
  IEventTrackingPort,
} from '@packmind/types';

import {
  IListDetectionProgramUseCase,
  ListDetectionProgramCommand,
  ListDetectionProgramResponse,
  IStandardsPort,
  ISpacesPort,
  IDeploymentPort,
} from '@packmind/types';
import { ActiveDetectionProgram } from '@packmind/types';
import {
  DetectionProgram,
  DetectionModeEnum,
  SourceCodeState,
} from '@packmind/types';
import { DetectionProgramService } from '../../services/DetectionProgramService';

const origin = 'ListDetectionProgramUseCase';

export class ListDetectionProgramUseCase
  implements IListDetectionProgramUseCase
{
  constructor(
    private readonly detectionProgramService: DetectionProgramService,
    private readonly deploymentsQueryAdapter: IDeploymentPort | undefined,
    private readonly standardsAdapter: IStandardsPort | undefined,
    private readonly spacesAdapter: ISpacesPort | undefined,
    private readonly gitPort: IGitPort,
    private readonly eventTrackingPort: IEventTrackingPort | null,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('ListDetectionProgramUseCase initialized');
  }

  async execute(
    command: ListDetectionProgramCommand,
  ): Promise<ListDetectionProgramResponse> {
    this.logger.info('Starting listDetectionProgram process', {
      gitRemoteUrl: command.gitRemoteUrl,
      organizationId: command.organizationId,
      userId: command.userId,
    });

    try {
      // Input validation
      this.validateInput(command);

      // Parse Git remote URL to extract owner and repo
      const { owner, repo } = this.parseGitRemoteUrl(command.gitRemoteUrl);
      this.logger.debug('Parsed Git remote URL', { owner, repo });

      // Try to find Git repository by iterating through branches
      let gitRepo: GitRepo | null = null;
      for (const branch of command.branches) {
        gitRepo = (
          await this.gitPort.findGitRepoByOwnerRepoAndBranchInOrganization({
            owner,
            repo,
            branch,
            organizationId: createOrganizationId(command.organizationId),
            userId: command.userId,
          })
        )?.gitRepo;

        if (gitRepo) {
          this.logger.info('Git repository found with branch match', {
            owner,
            repo,
            branch,
          });
          break;
        }
      }

      // Fallback: search at organization level if no branch matched
      if (!gitRepo) {
        this.logger.info(
          'No repository found with specific branches, trying organization-level fallback',
          {
            owner,
            repo,
            branches: command.branches,
          },
        );

        const orgRepos = await this.gitPort.getOrganizationRepositories(
          createOrganizationId(command.organizationId),
        );

        const matchingRepos = orgRepos.filter(
          (r) => r.owner === owner && r.repo === repo,
        );

        if (matchingRepos.length > 0) {
          // Sort by createdAt if available
          const sortedRepos = matchingRepos.sort((a, b) => {
            const aCreatedAt = (a as { createdAt?: Date }).createdAt;
            const bCreatedAt = (b as { createdAt?: Date }).createdAt;
            if (aCreatedAt && bCreatedAt) {
              return aCreatedAt.getTime() - bCreatedAt.getTime();
            }
            return 0;
          });

          gitRepo = sortedRepos[0];
          this.logger.info('Git repository found using organization fallback', {
            owner,
            repo,
            gitRepoId: gitRepo.id,
          });
        }
      }

      if (!gitRepo) {
        this.logger.info('Git repository not found', {
          owner,
          repo,
          gitRemoteUrl: command.gitRemoteUrl,
        });
        throw new Error(
          `Git repository (url: ${command.gitRemoteUrl}) is not connected to your organization`,
        );
      }

      // Get targets for the git repository
      const targets = await this.findTargets(
        gitRepo.id,
        createOrganizationId(command.organizationId),
        createUserId(command.userId),
      );

      if (targets.length === 0) {
        this.logger.info('No targets found for repository', {
          gitRepoId: gitRepo.id,
          branch: gitRepo.branch,
        });
        throw new Error(
          `No targets are found on the git repo ${gitRepo.owner}/${gitRepo.repo}`,
        );
      }

      // For each target, get deployed standards
      const targetsWithStandards: ListDetectionProgramResponse['targets'] = [];

      for (const target of targets) {
        const deployedStandards = await this.findDeployedStandardsForTarget(
          target.id,
          createOrganizationId(command.organizationId),
          createUserId(command.userId),
        );

        if (deployedStandards.length > 0) {
          // Filter standards with detection programs
          const standardsWithDetectionPrograms =
            await this.filterStandardsWithDetectionPrograms(
              deployedStandards,
              command.organizationId,
              createUserId(command.userId),
            );

          if (standardsWithDetectionPrograms.length > 0) {
            targetsWithStandards.push({
              name: target.name,
              path: target.path,
              standards: standardsWithDetectionPrograms,
            });
          }
        }
      }

      this.logger.info(
        'Successfully retrieved targets with detection programs',
        {
          targetsCount: targetsWithStandards.length,
        },
      );

      // Track analytics event
      if (this.eventTrackingPort) {
        await this.eventTrackingPort.trackEvent(
          createUserId(command.userId),
          createOrganizationId(command.organizationId),
          'linter_called',
        );
        this.logger.debug('Analytics event tracked', {
          event: 'linter_called',
        });
      }

      return { targets: targetsWithStandards };
    } catch (error) {
      this.logger.error('Failed to list detection programs', {
        gitRemoteUrl: command.gitRemoteUrl,
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private validateInput(command: ListDetectionProgramCommand): void {
    if (!command.gitRemoteUrl || command.gitRemoteUrl.trim() === '') {
      throw new Error('gitRemoteUrl is required and cannot be empty');
    }
    if (!command.branches || command.branches.length === 0) {
      throw new Error('The current git repository does not have any branch');
    }
  }

  public parseGitRemoteUrl(gitRemoteUrl: string): {
    owner: string;
    repo: string;
  } {
    // gitRemoteUrl format: domain/path/to/repo
    // For GitLab nested groups: gitlab.com/group/subgroup/repo
    // owner should be: group/subgroup, repo: repo

    // Remove trailing slashes to prevent empty strings in split result
    let cleanUrl = gitRemoteUrl;
    while (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }
    const gitData = cleanUrl.split('/');

    if (gitData.length < 3) {
      throw new Error(`Invalid Git remote URL format: ${gitRemoteUrl}`);
    }

    // Extract domain (first part) and the rest is the project path
    const projectPath = gitData.slice(1);

    // Last part is the repo name, everything before is the owner/group path
    const repo = projectPath[projectPath.length - 1];
    const owner = projectPath.slice(0, -1).join('/');

    return { owner, repo };
  }

  private async findGitRepository(
    owner: string,
    repo: string,
  ): Promise<GitRepo | null> {
    return this.gitPort.findGitRepoByOwnerAndRepo(owner, repo);
  }

  private async findTargets(
    gitRepoId: GitRepoId,
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<import('@packmind/types').Target[]> {
    if (!this.deploymentsQueryAdapter) {
      this.logger.warn(
        'DeploymentsQueryAdapter not available, returning empty results',
      );
      return [];
    }

    try {
      const targets = await this.deploymentsQueryAdapter.getTargetsByGitRepo({
        organizationId,
        userId,
        gitRepoId,
      });

      return targets || [];
    } catch (error) {
      this.logger.error('Failed to get targets for repository', {
        gitRepoId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  private async findDeployedStandardsForTarget(
    targetId: import('@packmind/types').TargetId,
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<StandardVersion[]> {
    if (!this.deploymentsQueryAdapter) {
      this.logger.warn(
        'DeploymentsQueryAdapter not available, returning empty results',
      );
      return [];
    }

    if (!this.standardsAdapter) {
      this.logger.warn(
        'StandardsAdapter not available, returning empty results',
      );
      return [];
    }

    try {
      const standardVersionInfos =
        await this.deploymentsQueryAdapter.findActiveStandardVersionsByTarget({
          organizationId,
          userId,
          targetId,
        });

      if (!standardVersionInfos || !Array.isArray(standardVersionInfos)) {
        return [];
      }

      // Convert StandardVersionInfo to StandardVersion entities
      const standardVersions: StandardVersion[] = [];

      for (const info of standardVersionInfos) {
        try {
          const standardVersion =
            await this.standardsAdapter.getStandardVersion(info.id);
          if (standardVersion) {
            standardVersions.push(standardVersion);
          }
        } catch (error) {
          this.logger.warn('Failed to get standard version details', {
            standardId: info.standardId,
            version: info.version,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return standardVersions;
    } catch (error) {
      this.logger.error('Failed to get deployed standards for target', {
        targetId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  private async filterStandardsWithDetectionPrograms(
    deployedStandards: StandardVersion[],
    organizationId: string,
    userId: UserId,
  ): Promise<ListDetectionProgramResponse['targets'][0]['standards']> {
    if (!this.standardsAdapter || !this.spacesAdapter) {
      this.logger.warn(
        'StandardsAdapter or SpacesAdapter not available, returning empty results',
      );
      return [];
    }

    if (deployedStandards.length === 0) {
      return [];
    }

    const standardIds = [
      ...new Set(
        deployedStandards.map(
          (standard: StandardVersion) => standard.standardId,
        ),
      ),
    ];

    // Get all spaces for the organization
    const spaces = await this.spacesAdapter.listSpacesByOrganization(
      createOrganizationId(organizationId),
    );

    // Get all standards across all spaces
    const standardsPort = this.standardsAdapter;
    const standardsPerSpace = await Promise.all(
      spaces.map((space) =>
        standardsPort.listStandardsBySpace(
          space.id,
          createOrganizationId(organizationId),
          userId,
        ),
      ),
    );

    // Flatten standards from all spaces
    const allStandards = standardsPerSpace.flat();

    // Handle case where service returns undefined or null
    if (!allStandards || !Array.isArray(allStandards)) {
      return [];
    }

    // Filter to only include deployed standards
    const deployedStandardsWithDetails = allStandards.filter((standard) =>
      standardIds.includes(standard.id),
    );

    // For each deployed standard, get its rules and filter for detection programs
    const filteredStandards: ListDetectionProgramResponse['targets'][0]['standards'] =
      [];

    for (const standard of deployedStandardsWithDetails) {
      try {
        const rules = (await this.standardsAdapter.getLatestRulesByStandardId(
          standard.id,
        )) as Rule[];

        const rulesWithDetectionPrograms: {
          content: string;
          activeDetectionPrograms: {
            language: string;
            detectionProgram: {
              mode: DetectionModeEnum;
              code: string;
              sourceCodeState: SourceCodeState;
            };
          }[];
        }[] = [];

        for (const rule of rules) {
          try {
            const activeWithPrograms =
              (await this.detectionProgramService.findActiveByRuleIdWithPrograms(
                rule.id,
              )) as (ActiveDetectionProgram & {
                detectionProgram: DetectionProgram;
              })[];
            const mapped = (activeWithPrograms || [])
              .map((adp) => ({
                language: adp.language,
                detectionProgram: {
                  mode: adp.detectionProgram?.mode,
                  code: adp.detectionProgram?.code,
                  sourceCodeState: adp.detectionProgram?.sourceCodeState,
                },
              }))
              .filter((x) =>
                Boolean(
                  x.detectionProgram &&
                    x.detectionProgram.code &&
                    x.detectionProgram.mode,
                ),
              );

            if (mapped.length > 0) {
              rulesWithDetectionPrograms.push({
                content: rule.content,
                activeDetectionPrograms: mapped,
              });
            }
          } catch (err) {
            this.logger.warn(
              'Failed to get active detection programs for rule',
              {
                standardId: standard.id,
                ruleId: rule.id,
                error: err instanceof Error ? err.message : String(err),
              },
            );
          }
        }

        // Only include standards that have at least one rule with detection programs
        if (rulesWithDetectionPrograms.length > 0) {
          filteredStandards.push({
            name: standard.name,
            slug: standard.slug,
            scope: standard.scope ? [standard.scope] : [],
            rules: rulesWithDetectionPrograms,
          });
        }
      } catch (error) {
        this.logger.warn('Failed to get rules for standard', {
          standardId: standard.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return filteredStandards;
  }
}
