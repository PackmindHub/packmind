import {
  Package,
  Recipe,
  RecipeId,
  Skill,
  SkillId,
  Standard,
  StandardId,
  DeployedRecipeTargetInfo,
  DeployedStandardTargetInfo,
  DeployedSkillTargetInfo,
} from '@packmind/types';

export type PendingRecipeInfo = {
  id: RecipeId;
  name: string;
  slug: string;
};

export type PendingStandardInfo = {
  id: StandardId;
  name: string;
  slug: string;
};

export type PendingSkillInfo = {
  id: SkillId;
  name: string;
  slug: string;
};

export type GroupTargetByPackageLookups = {
  recipesById: ReadonlyMap<RecipeId, Recipe>;
  standardsById: ReadonlyMap<StandardId, Standard>;
  skillsById: ReadonlyMap<SkillId, Skill>;
};

export type PackageGroup = {
  pkg: Package;
  recipes: ReadonlyArray<DeployedRecipeTargetInfo>;
  standards: ReadonlyArray<DeployedStandardTargetInfo>;
  skills: ReadonlyArray<DeployedSkillTargetInfo>;
  pendingRecipes: ReadonlyArray<PendingRecipeInfo>;
  pendingStandards: ReadonlyArray<PendingStandardInfo>;
  pendingSkills: ReadonlyArray<PendingSkillInfo>;
};

export type TargetArtifactsForGrouping = {
  recipes: ReadonlyArray<DeployedRecipeTargetInfo>;
  standards: ReadonlyArray<DeployedStandardTargetInfo>;
  skills: ReadonlyArray<DeployedSkillTargetInfo>;
};

export function groupTargetByPackage(
  target: TargetArtifactsForGrouping,
  packages: ReadonlyArray<Package>,
  lookups?: GroupTargetByPackageLookups,
): PackageGroup[] {
  return packages
    .map((pkg) => {
      const deployedRecipes = target.recipes.filter((r) =>
        pkg.recipes.includes(r.recipe.id),
      );
      const deployedStandards = target.standards.filter((s) =>
        pkg.standards.includes(s.standard.id),
      );
      const deployedSkills = target.skills.filter((s) =>
        pkg.skills.includes(s.skill.id),
      );

      const deployedRecipeIds = new Set(
        deployedRecipes.map((r) => r.recipe.id),
      );
      const deployedStandardIds = new Set(
        deployedStandards.map((s) => s.standard.id),
      );
      const deployedSkillIds = new Set(deployedSkills.map((s) => s.skill.id));

      const pendingRecipes: PendingRecipeInfo[] = lookups
        ? pkg.recipes
            .filter((id) => !deployedRecipeIds.has(id))
            .map((id) => lookups.recipesById.get(id))
            .filter((r): r is Recipe => Boolean(r))
            .map((r) => ({ id: r.id, name: r.name, slug: r.slug }))
        : [];

      const pendingStandards: PendingStandardInfo[] = lookups
        ? pkg.standards
            .filter((id) => !deployedStandardIds.has(id))
            .map((id) => lookups.standardsById.get(id))
            .filter((s): s is Standard => Boolean(s))
            .map((s) => ({ id: s.id, name: s.name, slug: s.slug }))
        : [];

      const pendingSkills: PendingSkillInfo[] = lookups
        ? pkg.skills
            .filter((id) => !deployedSkillIds.has(id))
            .map((id) => lookups.skillsById.get(id))
            .filter((s): s is Skill => Boolean(s))
            .map((s) => ({ id: s.id, name: s.name, slug: s.slug }))
        : [];

      return {
        pkg,
        recipes: deployedRecipes,
        standards: deployedStandards,
        skills: deployedSkills,
        pendingRecipes,
        pendingStandards,
        pendingSkills,
      };
    })
    .filter(
      (g) =>
        g.recipes.length +
          g.standards.length +
          g.skills.length +
          g.pendingRecipes.length +
          g.pendingStandards.length +
          g.pendingSkills.length >
        0,
    )
    .sort((a, b) => a.pkg.name.localeCompare(b.pkg.name));
}
