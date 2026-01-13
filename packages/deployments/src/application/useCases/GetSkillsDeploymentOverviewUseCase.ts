import { PackmindLogger } from '@packmind/logger';
import {
  ISpacesPort,
  ISkillsPort,
  Skill,
  SkillId,
  SkillVersion,
  createSkillVersionId,
  IGetSkillDeploymentOverview,
  GetSkillDeploymentOverviewCommand,
  DistributionStatus,
  TargetSkillDeploymentStatus,
  TargetSkillDeploymentInfo,
  DeployedSkillTargetInfo,
  IGitPort,
  OrganizationId,
  Distribution,
  SkillDeploymentOverview,
  RepositorySkillDeploymentStatus,
  SkillDeploymentStatus,
  DeployedSkillInfo,
  RepositorySkillDeploymentInfo,
  GitRepo,
} from '@packmind/types';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';

const origin = 'GetSkillsDeploymentOverviewUseCase';

export class GetSkillsDeploymentOverviewUseCase implements IGetSkillDeploymentOverview {
  constructor(
    private readonly distributionRepository: IDistributionRepository,
    private readonly skillsPort: ISkillsPort,
    private readonly gitPort: IGitPort,
    private readonly spacesPort: ISpacesPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: GetSkillDeploymentOverviewCommand,
  ): Promise<SkillDeploymentOverview> {
    this.logger.info('Getting skills deployment overview', {
      organizationId: command.organizationId,
    });

    try {
      // Fetch only successful distributions for the organization
      const distributions =
        await this.distributionRepository.listByOrganizationIdWithStatus(
          command.organizationId as OrganizationId,
          DistributionStatus.success, // Filter only successful distributions for overview
        );

      // Get all spaces for the organization
      const spaces = await this.spacesPort.listSpacesByOrganization(
        command.organizationId as OrganizationId,
      );

      // Get all skills across all spaces and git repos
      const [skillsPerSpace, gitRepos] = await Promise.all([
        Promise.all(
          spaces.map((space) =>
            this.skillsPort.listSkillsBySpace(
              space.id,
              command.organizationId as OrganizationId,
              command.userId,
            ),
          ),
        ),
        this.gitPort.getOrganizationRepositories(
          command.organizationId as OrganizationId,
        ),
      ]);

      // Flatten skills from all spaces
      const skills = skillsPerSpace.flat();

      // Build the overview using the distribution data
      const overview = this.buildOverviewFromDistributions(
        distributions,
        skills,
        gitRepos,
      );

      this.logger.info('Successfully retrieved skills deployment overview', {
        organizationId: command.organizationId,
        repositoriesCount: overview.repositories.length,
        skillsCount: overview.skills.length,
      });

      return overview;
    } catch (error) {
      this.logger.error('Failed to get skills deployment overview', {
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private buildOverviewFromDistributions(
    distributions: Distribution[],
    skills: Skill[],
    gitRepos: GitRepo[],
  ): SkillDeploymentOverview {
    // Create a map of the latest skill versions for easy lookup
    const latestSkillVersionMap = this.buildLatestSkillVersionMap(skills);

    // Create a map of skills by ID for easy lookup
    const skillsMap = new Map<string, Skill>();
    skills.forEach((skill) => {
      const existing = skillsMap.get(skill.id);
      if (!existing || skill.version > existing.version) {
        skillsMap.set(skill.id, skill);
      }
    });

    // Build repository-centric view
    const repositories: RepositorySkillDeploymentStatus[] = gitRepos.map(
      (gitRepo) => {
        const deployedSkills = this.getDeployedSkillsForRepo(
          gitRepo,
          distributions,
          latestSkillVersionMap,
          skillsMap,
        );

        const hasOutdatedSkills = deployedSkills.some(
          (info) => !info.isUpToDate,
        );

        return {
          gitRepo,
          deployedSkills,
          hasOutdatedSkills,
        };
      },
    );

    // Build skill-centric view
    const skillStatuses: SkillDeploymentStatus[] = Array.from(
      skillsMap.values(),
    )
      .map((skill) => {
        // Find the latest version of this skill
        const latestVersion = latestSkillVersionMap.get(skill.id);
        if (!latestVersion) return null;

        const deploymentInfos = this.getDeploymentInfosForSkill(
          skill,
          latestVersion,
          gitRepos,
          distributions,
        );

        const hasOutdatedDeployments = deploymentInfos.some(
          (info) => !info.isUpToDate,
        );

        // Build target-based deployments for this skill
        const targetDeployments = this.buildTargetDeploymentsForSkill(
          skill,
          distributions,
          gitRepos,
        );

        return {
          skill,
          latestVersion,
          deployments: deploymentInfos,
          targetDeployments,
          hasOutdatedDeployments,
        };
      })
      .filter((status): status is SkillDeploymentStatus => status !== null);

    // Build target-centric view
    const targets = this.buildTargetCentricView(
      distributions,
      skills,
      gitRepos,
    );

    return {
      repositories,
      targets,
      skills: skillStatuses,
    };
  }

  public buildTargetCentricView(
    distributions: Distribution[],
    skills: Skill[],
    gitRepos: GitRepo[],
  ): TargetSkillDeploymentStatus[] {
    // Group distributions by target
    const targetMap = new Map<string, Distribution[]>();

    for (const distribution of distributions) {
      if (distribution.target) {
        const targetId = distribution.target.id;
        if (!targetMap.has(targetId)) {
          targetMap.set(targetId, []);
        }
        const targetDistributions = targetMap.get(targetId);
        if (targetDistributions) {
          targetDistributions.push(distribution);
        }
      }
    }

    // Build target deployment status for each target
    const targetStatuses: TargetSkillDeploymentStatus[] = [];

    for (const [, targetDistributions] of targetMap.entries()) {
      const target = targetDistributions[0]?.target; // All distributions have the same target
      if (!target) continue;
      const gitRepo = gitRepos.find((repo) => repo.id === target.gitRepoId);

      if (!gitRepo) continue;

      // Get deployed skills for this target
      const deployedSkills: DeployedSkillTargetInfo[] = [];
      let hasOutdatedSkills = false;

      // Process each skill deployed to this target
      const skillVersionsMap = new Map<
        SkillId,
        SkillVersion & { deploymentDate: string }
      >();

      for (const distribution of targetDistributions) {
        // All distributions are successful since we filtered at query level
        const skillVersions = distribution.distributedPackages.flatMap(
          (dp) => dp.skillVersions,
        );
        for (const skillVersion of skillVersions) {
          const existing = skillVersionsMap.get(skillVersion.skillId);
          if (!existing || skillVersion.version > existing.version) {
            skillVersionsMap.set(skillVersion.skillId, {
              ...skillVersion,
              deploymentDate: distribution.createdAt,
            });
          }
        }
      }

      // Convert to DeployedSkillTargetInfo format
      for (const [skillId, deployedVersion] of skillVersionsMap.entries()) {
        const skill = skills.find((s) => s.id === skillId);
        if (!skill) continue;

        const latestVersion: SkillVersion = {
          // Convert Skill to SkillVersion
          id: createSkillVersionId(skill.id),
          skillId: skill.id,
          name: skill.name,
          slug: skill.slug,
          version: skill.version,
          description: skill.description,
          prompt: skill.prompt,
          userId: skill.userId,
          license: skill.license,
          compatibility: skill.compatibility,
          metadata: skill.metadata,
          allowedTools: skill.allowedTools,
        };
        const isUpToDate = deployedVersion.version >= latestVersion.version;

        if (!isUpToDate) {
          hasOutdatedSkills = true;
        }

        deployedSkills.push({
          skill,
          deployedVersion,
          latestVersion,
          isUpToDate,
          deploymentDate: deployedVersion.deploymentDate,
        });
      }

      targetStatuses.push({
        target,
        gitRepo,
        deployedSkills,
        hasOutdatedSkills,
      });
    }

    return targetStatuses;
  }

  public buildTargetDeploymentsForSkill(
    skill: Skill,
    allDistributions: Distribution[],
    gitRepos: GitRepo[],
  ): TargetSkillDeploymentInfo[] {
    // Filter distributions for this specific skill
    const skillDistributions = allDistributions.filter((distribution) =>
      distribution.distributedPackages.some((dp) =>
        dp.skillVersions.some((sv) => sv.skillId === skill.id),
      ),
    );

    // Group by target
    const targetDistributionMap = new Map<string, Distribution[]>();

    for (const distribution of skillDistributions) {
      if (distribution.target) {
        const targetId = distribution.target.id;
        if (!targetDistributionMap.has(targetId)) {
          targetDistributionMap.set(targetId, []);
        }
        const targetDistributions = targetDistributionMap.get(targetId);
        if (targetDistributions) {
          targetDistributions.push(distribution);
        }
      }
    }

    const targetDeployments: TargetSkillDeploymentInfo[] = [];

    for (const [, targetDistributions] of targetDistributionMap.entries()) {
      const target = targetDistributions[0]?.target;
      if (!target) continue;
      const gitRepo = gitRepos.find((repo) => repo.id === target.gitRepoId);

      if (!gitRepo) continue;

      // Find the latest deployed version for this skill on this target
      let latestDeployedVersion: SkillVersion | null = null;
      let latestDeploymentDate = '';

      for (const distribution of targetDistributions) {
        const skillVersions = distribution.distributedPackages.flatMap(
          (dp) => dp.skillVersions,
        );
        for (const skillVersion of skillVersions) {
          if (skillVersion.skillId === skill.id) {
            if (
              !latestDeployedVersion ||
              skillVersion.version > latestDeployedVersion.version
            ) {
              latestDeployedVersion = skillVersion;
              latestDeploymentDate = distribution.createdAt;
            }
          }
        }
      }

      if (latestDeployedVersion) {
        const latestVersion: SkillVersion = {
          id: createSkillVersionId(skill.id),
          skillId: skill.id,
          name: skill.name,
          slug: skill.slug,
          version: skill.version,
          description: skill.description,
          prompt: skill.prompt,
          userId: skill.userId,
          license: skill.license,
          compatibility: skill.compatibility,
          metadata: skill.metadata,
          allowedTools: skill.allowedTools,
        };

        targetDeployments.push({
          target,
          gitRepo,
          deployedVersion: latestDeployedVersion,
          isUpToDate: latestDeployedVersion.version >= latestVersion.version,
          deploymentDate: latestDeploymentDate,
        });
      }
    }

    return targetDeployments;
  }

  private buildLatestSkillVersionMap(
    skills: Skill[],
  ): Map<string, SkillVersion> {
    const map = new Map<string, SkillVersion>();

    skills.forEach((skill) => {
      const existing = map.get(skill.id);
      if (!existing || skill.version > existing.version) {
        // Convert Skill to SkillVersion format
        const skillVersion: SkillVersion = {
          id: createSkillVersionId(skill.id),
          skillId: skill.id,
          name: skill.name,
          slug: skill.slug,
          version: skill.version,
          description: skill.description,
          prompt: skill.prompt,
          userId: skill.userId,
          license: skill.license,
          compatibility: skill.compatibility,
          metadata: skill.metadata,
          allowedTools: skill.allowedTools,
        };
        map.set(skill.id, skillVersion);
      }
    });

    return map;
  }

  private getDeployedSkillsForRepo(
    gitRepo: GitRepo,
    distributions: Distribution[],
    latestSkillVersionMap: Map<string, SkillVersion>,
    skillsMap: Map<string, Skill>,
  ): DeployedSkillInfo[] {
    const repoDistributions = distributions.filter((distribution) => {
      // Use the new single-reference model
      return distribution.target?.gitRepoId === gitRepo.id;
    });

    // Get the latest distribution for this repo
    const latestDistribution = repoDistributions.reduce(
      (latest, current) => {
        if (
          !latest ||
          new Date(current.createdAt) > new Date(latest.createdAt)
        ) {
          return current;
        }
        return latest;
      },
      null as Distribution | null,
    );

    if (!latestDistribution) {
      return [];
    }

    // Get all unique skills from the latest distribution
    const deployedSkillsMap = new Map<string, SkillVersion>();
    const skillVersions = latestDistribution.distributedPackages.flatMap(
      (dp) => dp.skillVersions,
    );
    skillVersions.forEach((skillVersion) => {
      const existing = deployedSkillsMap.get(skillVersion.skillId);
      if (!existing || skillVersion.version > existing.version) {
        deployedSkillsMap.set(skillVersion.skillId, skillVersion);
      }
    });

    return Array.from(deployedSkillsMap.values())
      .map((deployedVersion) => {
        const latestVersion = latestSkillVersionMap.get(
          deployedVersion.skillId,
        );
        if (!latestVersion) {
          // This should not happen in normal circumstances
          return null;
        }

        // Find the skill entity
        const skill = skillsMap.get(deployedVersion.skillId);
        if (!skill) {
          return null;
        }

        const isUpToDate = deployedVersion.version >= latestVersion.version;

        return {
          skill,
          deployedVersion,
          latestVersion,
          isUpToDate,
          deploymentDate: latestDistribution.createdAt,
        };
      })
      .filter((info): info is DeployedSkillInfo => info !== null);
  }

  private getDeploymentInfosForSkill(
    skill: Skill,
    latestVersion: SkillVersion,
    gitRepos: GitRepo[],
    distributions: Distribution[],
  ): RepositorySkillDeploymentInfo[] {
    const skillDistributions = distributions.filter((distribution) =>
      distribution.distributedPackages.some((dp) =>
        dp.skillVersions.some((version) => version.skillId === skill.id),
      ),
    );

    const deploymentInfos: RepositorySkillDeploymentInfo[] = [];

    gitRepos.forEach((gitRepo) => {
      // Find the latest distribution of this skill to this repo
      const repoDistributions = skillDistributions.filter(
        (distribution) => distribution.target?.gitRepoId === gitRepo.id,
      );

      if (repoDistributions.length === 0) {
        return; // No distributions to this repo
      }

      const latestDistribution = repoDistributions.reduce((latest, current) => {
        if (
          !latest ||
          new Date(current.createdAt) > new Date(latest.createdAt)
        ) {
          return current;
        }
        return latest;
      }, repoDistributions[0]);

      // Find the latest version of this skill in the distribution
      const skillsInLatestDistribution = latestDistribution.distributedPackages
        .flatMap((dp) => dp.skillVersions)
        .filter((version) => version.skillId === skill.id);

      const deployedVersion = skillsInLatestDistribution.reduce(
        (latest, current) => {
          if (!latest || current.version > latest.version) {
            return current;
          }
          return latest;
        },
        skillsInLatestDistribution[0],
      );

      const isUpToDate = deployedVersion.version >= latestVersion.version;

      deploymentInfos.push({
        gitRepo,
        deployedVersion,
        isUpToDate,
        deploymentDate: latestDistribution.createdAt,
      });
    });

    return deploymentInfos;
  }
}
