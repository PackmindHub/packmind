import {
  Package,
  DeployedRecipeTargetInfo,
  DeployedStandardTargetInfo,
  DeployedSkillTargetInfo,
} from '@packmind/types';

export type PackageGroup = {
  pkg: Package;
  recipes: ReadonlyArray<DeployedRecipeTargetInfo>;
  standards: ReadonlyArray<DeployedStandardTargetInfo>;
  skills: ReadonlyArray<DeployedSkillTargetInfo>;
};

export type TargetArtifactsForGrouping = {
  recipes: ReadonlyArray<DeployedRecipeTargetInfo>;
  standards: ReadonlyArray<DeployedStandardTargetInfo>;
  skills: ReadonlyArray<DeployedSkillTargetInfo>;
};

export function groupTargetByPackage(
  target: TargetArtifactsForGrouping,
  packages: ReadonlyArray<Package>,
): PackageGroup[] {
  return packages
    .map((pkg) => ({
      pkg,
      recipes: target.recipes.filter((r) => pkg.recipes.includes(r.recipe.id)),
      standards: target.standards.filter((s) =>
        pkg.standards.includes(s.standard.id),
      ),
      skills: target.skills.filter((s) => pkg.skills.includes(s.skill.id)),
    }))
    .filter((g) => g.recipes.length + g.standards.length + g.skills.length > 0)
    .sort((a, b) => a.pkg.name.localeCompare(b.pkg.name));
}
