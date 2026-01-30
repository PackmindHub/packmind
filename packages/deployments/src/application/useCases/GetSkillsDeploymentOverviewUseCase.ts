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
  PackageId,
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

      // Get all skills across all spaces (active only for the base list)
      const [activeSkillsPerSpace, gitRepos] = await Promise.all([
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

      // Flatten active skills from all spaces
      const activeSkills = activeSkillsPerSpace.flat();
      const activeSkillIds = new Set(activeSkills.map((s) => s.id));

      // Find skill IDs that are deleted but still effectively deployed
      // (only considering latest distribution per package per target)
      const deletedSkillIds = this.computeDeletedSkillIdsStillDeployed(
        distributions,
        activeSkillIds,
      );

      // Fetch deleted skills if any exist
      let deletedSkills: Skill[] = [];
      if (deletedSkillIds.length > 0) {
        const allSkillsPerSpace = await Promise.all(
          spaces.map((space) =>
            this.skillsPort.listSkillsBySpace(
              space.id,
              command.organizationId as OrganizationId,
              command.userId,
              { includeDeleted: true },
            ),
          ),
        );
        const allSkills = allSkillsPerSpace.flat();
        deletedSkills = allSkills.filter(
          (s) => deletedSkillIds.includes(s.id) && !activeSkillIds.has(s.id),
        );
      }

      // Combine active and deleted skills for building the overview
      const allSkills = [...activeSkills, ...deletedSkills];

      // Build the overview using the distribution data
      const overview = this.buildOverviewFromDistributions(
        distributions,
        allSkills,
        gitRepos,
        activeSkillIds,
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
    activeSkillIds?: Set<SkillId>,
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

        // Determine if skill is deleted (not in active skills set)
        const isDeleted = activeSkillIds
          ? !activeSkillIds.has(skill.id as SkillId)
          : undefined;

        const status: SkillDeploymentStatus = {
          skill,
          latestVersion,
          deployments: deploymentInfos,
          targetDeployments,
          hasOutdatedDeployments,
        };

        if (isDeleted) {
          status.isDeleted = true;
        }

        return status;
      })
      .filter((status): status is SkillDeploymentStatus => status !== null);

    // Build target-centric view
    const targets = this.buildTargetCentricView(
      distributions,
      skills,
      gitRepos,
      activeSkillIds,
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
    activeSkillIds?: Set<SkillId>,
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

      // Sort distributions newest first to find the latest distribution per package
      const sortedDistributions = [...targetDistributions].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      // First pass: Track the latest distribution for each package
      const latestDistributionPerPackage = new Map<
        PackageId,
        { skillVersions: SkillVersion[]; deploymentDate: string }
      >();

      for (const distribution of sortedDistributions) {
        for (const dp of distribution.distributedPackages) {
          if (!dp || !dp.skillVersions) continue;
          // Only keep the first (latest) occurrence of each package
          if (!latestDistributionPerPackage.has(dp.packageId)) {
            // Skip packages with 'remove' operation - they should not contribute skills
            if (dp.operation === 'remove') {
              latestDistributionPerPackage.set(dp.packageId, {
                skillVersions: [],
                deploymentDate: distribution.createdAt,
              });
            } else {
              latestDistributionPerPackage.set(dp.packageId, {
                skillVersions: dp.skillVersions.filter(
                  (sv) => sv && sv.skillId,
                ),
                deploymentDate: distribution.createdAt,
              });
            }
          }
        }
      }

      // Second pass: Extract skill versions from latest distributions only
      const skillVersionsMap = new Map<
        SkillId,
        SkillVersion & { deploymentDate: string }
      >();

      for (const [, data] of latestDistributionPerPackage) {
        for (const skillVersion of data.skillVersions) {
          const existing = skillVersionsMap.get(skillVersion.skillId);
          if (!existing || skillVersion.version > existing.version) {
            skillVersionsMap.set(skillVersion.skillId, {
              ...skillVersion,
              deploymentDate: data.deploymentDate,
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

        const isDeleted = activeSkillIds
          ? !activeSkillIds.has(skill.id as SkillId)
          : undefined;

        if (!isUpToDate || isDeleted) {
          hasOutdatedSkills = true;
        }

        deployedSkills.push({
          skill,
          deployedVersion,
          latestVersion,
          isUpToDate,
          deploymentDate: deployedVersion.deploymentDate,
          ...(isDeleted && { isDeleted }),
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
    // Group ALL distributions by target (not just those containing the skill)
    const targetDistributionMap = new Map<string, Distribution[]>();

    for (const distribution of allDistributions) {
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

      // Sort distributions newest first to find the latest distribution per package
      const sortedDistributions = [...targetDistributions].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      // First pass: Track the latest distribution for each package
      const latestDistributionPerPackage = new Map<
        PackageId,
        { skillVersions: SkillVersion[]; deploymentDate: string }
      >();

      for (const distribution of sortedDistributions) {
        for (const dp of distribution.distributedPackages) {
          if (!dp || !dp.skillVersions) continue;
          // Only keep the first (latest) occurrence of each package
          if (!latestDistributionPerPackage.has(dp.packageId)) {
            // Skip packages with 'remove' operation - they should not contribute skills
            if (dp.operation === 'remove') {
              latestDistributionPerPackage.set(dp.packageId, {
                skillVersions: [],
                deploymentDate: distribution.createdAt,
              });
            } else {
              latestDistributionPerPackage.set(dp.packageId, {
                skillVersions: dp.skillVersions.filter(
                  (sv) => sv && sv.skillId,
                ),
                deploymentDate: distribution.createdAt,
              });
            }
          }
        }
      }

      // Second pass: Find the skill in the latest distributions
      let latestDeployedVersion: SkillVersion | null = null;
      let latestDeploymentDate = '';

      for (const [, data] of latestDistributionPerPackage) {
        for (const skillVersion of data.skillVersions) {
          if (skillVersion.skillId === skill.id) {
            if (
              !latestDeployedVersion ||
              skillVersion.version > latestDeployedVersion.version
            ) {
              latestDeployedVersion = skillVersion;
              latestDeploymentDate = data.deploymentDate;
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
    const skillVersions = latestDistribution.distributedPackages
      .filter((dp) => dp && dp.skillVersions)
      .flatMap((dp) => dp.skillVersions)
      .filter((sv) => sv && sv.skillId);
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
        .filter((dp) => dp && dp.skillVersions)
        .flatMap((dp) => dp.skillVersions)
        .filter((version) => version && version.skillId === skill.id);

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

  /**
   * Computes deleted skill IDs that are still effectively deployed.
   * A deleted skill is considered "still deployed" only if ALL packages that
   * ever contained it still have it in their latest distribution.
   *
   * If ANY package that previously contained the skill has been redistributed
   * without the skill, the skill is excluded from the result.
   */
  private computeDeletedSkillIdsStillDeployed(
    distributions: Distribution[],
    activeSkillIds: Set<SkillId>,
  ): SkillId[] {
    // Group distributions by target
    const targetDistributions = new Map<string, Distribution[]>();
    for (const distribution of distributions) {
      if (distribution.target) {
        const targetId = distribution.target.id;
        if (!targetDistributions.has(targetId)) {
          targetDistributions.set(targetId, []);
        }
        const targetDists = targetDistributions.get(targetId);
        if (targetDists) {
          targetDists.push(distribution);
        }
      }
    }

    // Collect skill IDs that are still effectively deployed across all targets
    const effectivelyDeployedSkillIds = new Set<SkillId>();

    for (const [, targetDists] of targetDistributions) {
      // Sort distributions newest first
      const sortedDistributions = [...targetDists].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      // First pass: Track which packages EVER had each skill (from ALL distributions)
      const packagesPerSkill = new Map<SkillId, Set<PackageId>>();
      for (const distribution of sortedDistributions) {
        for (const dp of distribution.distributedPackages) {
          if (!dp || !dp.skillVersions || dp.operation === 'remove') continue;
          for (const sv of dp.skillVersions) {
            if (!sv || !sv.skillId) continue;
            if (!packagesPerSkill.has(sv.skillId)) {
              packagesPerSkill.set(sv.skillId, new Set());
            }
            packagesPerSkill.get(sv.skillId)!.add(dp.packageId);
          }
        }
      }

      // Second pass: Track the LATEST distribution per package (skills in that latest dist)
      const latestSkillsPerPackage = new Map<PackageId, Set<SkillId>>();
      for (const distribution of sortedDistributions) {
        for (const dp of distribution.distributedPackages) {
          if (!dp || !dp.skillVersions) continue;
          // Only keep the first (latest) occurrence of each package
          if (!latestSkillsPerPackage.has(dp.packageId)) {
            const skillIds = new Set<SkillId>();
            // Skip packages with 'remove' operation - they have no skills
            if (dp.operation !== 'remove') {
              for (const sv of dp.skillVersions) {
                if (sv && sv.skillId) {
                  skillIds.add(sv.skillId);
                }
              }
            }
            latestSkillsPerPackage.set(dp.packageId, skillIds);
          }
        }
      }

      // Third pass: For each skill, check if ALL packages that ever had it still have it
      for (const [skillId, packagesThatHadSkill] of packagesPerSkill) {
        // Skip active skills
        if (activeSkillIds.has(skillId)) continue;

        // Check if ANY package that ever had this skill no longer has it
        let allPackagesStillHaveSkill = true;
        for (const packageId of packagesThatHadSkill) {
          const latestSkills = latestSkillsPerPackage.get(packageId);
          if (!latestSkills || !latestSkills.has(skillId)) {
            // This package's latest distribution doesn't have the skill
            allPackagesStillHaveSkill = false;
            break;
          }
        }

        // Only include if ALL packages that ever had it still have it in latest
        if (allPackagesStillHaveSkill) {
          effectivelyDeployedSkillIds.add(skillId);
        }
      }
    }

    // Return skills that are effectively deployed but no longer active
    return Array.from(effectivelyDeployedSkillIds).filter(
      (id) => !activeSkillIds.has(id),
    );
  }
}
