import {
  ActiveDistributedPackagesByTarget,
  DeployedCommandTargetInfo,
  DeployedSkillTargetInfo,
  DeployedStandardTargetInfo,
  GitRepo,
  CommandDeploymentStatus,
  CommandId,
  SkillDeploymentStatus,
  SkillId,
  StandardDeploymentStatus,
  StandardId,
  Target,
  TargetDeploymentInfo,
  TargetSkillDeploymentInfo,
  TargetStandardDeploymentInfo,
} from '@packmind/types';

export type ArtifactRollups = {
  recipes: CommandDeploymentStatus[];
  standards: StandardDeploymentStatus[];
  skills: SkillDeploymentStatus[];
};

type CommandRollup = {
  first: DeployedCommandTargetInfo;
  isDeleted: boolean;
  targetDeployments: TargetDeploymentInfo[];
};

type StandardRollup = {
  first: DeployedStandardTargetInfo;
  isDeleted: boolean;
  targetDeployments: TargetStandardDeploymentInfo[];
};

type SkillRollup = {
  first: DeployedSkillTargetInfo;
  isDeleted: boolean;
  targetDeployments: TargetSkillDeploymentInfo[];
};

export function buildArtifactRollups(
  entries: ReadonlyArray<ActiveDistributedPackagesByTarget>,
): ArtifactRollups {
  const recipes = new Map<CommandId, CommandRollup>();
  const standards = new Map<StandardId, StandardRollup>();
  const skills = new Map<SkillId, SkillRollup>();

  for (const entry of entries) {
    if (!entry.gitRepo) continue;
    const { target, gitRepo } = entry;
    entry.packages.forEach((pkg) => {
      pkg.deployedRecipes.forEach((d) =>
        accumulateCommand(recipes, d, target, gitRepo),
      );
      pkg.deployedStandards.forEach((d) =>
        accumulateStandard(standards, d, target, gitRepo),
      );
      pkg.deployedSkills.forEach((d) =>
        accumulateSkill(skills, d, target, gitRepo),
      );
    });
  }

  return {
    recipes: Array.from(recipes.values()).map(toCommandStatus),
    standards: Array.from(standards.values()).map(toStandardStatus),
    skills: Array.from(skills.values()).map(toSkillStatus),
  };
}

function accumulateCommand(
  rollup: Map<CommandId, CommandRollup>,
  deployment: DeployedCommandTargetInfo,
  target: Target,
  gitRepo: GitRepo,
): void {
  const targetDeployment: TargetDeploymentInfo = {
    target,
    gitRepo,
    deployedVersion: deployment.deployedVersion,
    isUpToDate: deployment.isUpToDate,
    deploymentDate: deployment.deploymentDate,
  };
  const existing = rollup.get(deployment.recipe.id);
  if (existing) {
    existing.targetDeployments.push(targetDeployment);
    if (deployment.isDeleted) existing.isDeleted = true;
    return;
  }
  rollup.set(deployment.recipe.id, {
    first: deployment,
    isDeleted: !!deployment.isDeleted,
    targetDeployments: [targetDeployment],
  });
}

function accumulateStandard(
  rollup: Map<StandardId, StandardRollup>,
  deployment: DeployedStandardTargetInfo,
  target: Target,
  gitRepo: GitRepo,
): void {
  const targetDeployment: TargetStandardDeploymentInfo = {
    target,
    gitRepo,
    deployedVersion: deployment.deployedVersion,
    isUpToDate: deployment.isUpToDate,
    deploymentDate: deployment.deploymentDate,
  };
  const existing = rollup.get(deployment.standard.id);
  if (existing) {
    existing.targetDeployments.push(targetDeployment);
    if (deployment.isDeleted) existing.isDeleted = true;
    return;
  }
  rollup.set(deployment.standard.id, {
    first: deployment,
    isDeleted: !!deployment.isDeleted,
    targetDeployments: [targetDeployment],
  });
}

function accumulateSkill(
  rollup: Map<SkillId, SkillRollup>,
  deployment: DeployedSkillTargetInfo,
  target: Target,
  gitRepo: GitRepo,
): void {
  const targetDeployment: TargetSkillDeploymentInfo = {
    target,
    gitRepo,
    deployedVersion: deployment.deployedVersion,
    isUpToDate: deployment.isUpToDate,
    deploymentDate: deployment.deploymentDate,
  };
  const existing = rollup.get(deployment.skill.id);
  if (existing) {
    existing.targetDeployments.push(targetDeployment);
    if (deployment.isDeleted) existing.isDeleted = true;
    return;
  }
  rollup.set(deployment.skill.id, {
    first: deployment,
    isDeleted: !!deployment.isDeleted,
    targetDeployments: [targetDeployment],
  });
}

function toCommandStatus(rollup: CommandRollup): CommandDeploymentStatus {
  return {
    recipe: rollup.first.recipe,
    latestVersion: rollup.first.latestVersion,
    deployments: [],
    targetDeployments: rollup.targetDeployments,
    hasOutdatedDeployments: rollup.targetDeployments.some(
      (td) => !td.isUpToDate,
    ),
    ...(rollup.isDeleted && { isDeleted: true }),
  };
}

function toStandardStatus(rollup: StandardRollup): StandardDeploymentStatus {
  return {
    standard: rollup.first.standard,
    latestVersion: rollup.first.latestVersion,
    deployments: [],
    targetDeployments: rollup.targetDeployments,
    hasOutdatedDeployments: rollup.targetDeployments.some(
      (td) => !td.isUpToDate,
    ),
    ...(rollup.isDeleted && { isDeleted: true }),
  };
}

function toSkillStatus(rollup: SkillRollup): SkillDeploymentStatus {
  return {
    skill: rollup.first.skill,
    latestVersion: rollup.first.latestVersion,
    deployments: [],
    targetDeployments: rollup.targetDeployments,
    hasOutdatedDeployments: rollup.targetDeployments.some(
      (td) => !td.isUpToDate,
    ),
    ...(rollup.isDeleted && { isDeleted: true }),
  };
}
