import {
  createDeployedRecipeTargetInfo,
  packageFactory,
} from '@packmind/deployments/test';
import {
  createMockStandard,
  createDeployedStandardTargetInfo,
} from '@packmind/deployments/test';
import { skillFactory, skillVersionFactory } from '@packmind/skills/test';
import { recipeFactory } from '@packmind/recipes/test/recipeFactory';
import { standardFactory } from '@packmind/standards/test';
import {
  DeployedSkillTargetInfo,
  Package,
  Recipe,
  RecipeId,
  Skill,
  SkillId,
  Standard,
  StandardId,
} from '@packmind/types';
import {
  groupTargetByPackage,
  TargetArtifactsForGrouping,
} from './groupTargetByPackage';

const buildEmptyTarget = (): TargetArtifactsForGrouping => ({
  recipes: [],
  standards: [],
  skills: [],
});

const buildDeployedSkillTargetInfo = (
  skill: Skill,
): DeployedSkillTargetInfo => {
  const deployedVersion = skillVersionFactory({ skillId: skill.id });
  const latestVersion = skillVersionFactory({
    skillId: skill.id,
    version: deployedVersion.version + 1,
  });
  return {
    skill,
    deployedVersion,
    latestVersion,
    isUpToDate: false,
    deploymentDate: new Date().toISOString(),
  };
};

describe('groupTargetByPackage', () => {
  it('returns one group with the recipe when a single package contains the deployed recipe', () => {
    const recipe: Recipe = recipeFactory();
    const deployedRecipe = createDeployedRecipeTargetInfo({ recipe });
    const pkg: Package = packageFactory({
      name: 'alpha',
      recipes: [recipe.id],
    });

    const result = groupTargetByPackage(
      { ...buildEmptyTarget(), recipes: [deployedRecipe] },
      [pkg],
      undefined,
      new Set([pkg.id]),
    );

    expect(result).toEqual([
      {
        pkg,
        recipes: [deployedRecipe],
        standards: [],
        skills: [],
        pendingRecipes: [],
        pendingStandards: [],
        pendingSkills: [],
      },
    ]);
  });

  it('duplicates an artifact across packages that share it without deduplicating', () => {
    const standard: Standard = createMockStandard();
    const deployedStandard = createDeployedStandardTargetInfo({ standard });
    const pkgA: Package = packageFactory({
      name: 'alpha',
      standards: [standard.id],
    });
    const pkgB: Package = packageFactory({
      name: 'beta',
      standards: [standard.id],
    });

    const result = groupTargetByPackage(
      { ...buildEmptyTarget(), standards: [deployedStandard] },
      [pkgA, pkgB],
      undefined,
      new Set([pkgA.id, pkgB.id]),
    );

    expect(result.map((g) => g.pkg.name)).toEqual(['alpha', 'beta']);
  });

  it('keeps the deployed standard in each overlapping package group', () => {
    const standard: Standard = createMockStandard();
    const deployedStandard = createDeployedStandardTargetInfo({ standard });
    const pkgA: Package = packageFactory({
      name: 'alpha',
      standards: [standard.id],
    });
    const pkgB: Package = packageFactory({
      name: 'beta',
      standards: [standard.id],
    });

    const result = groupTargetByPackage(
      { ...buildEmptyTarget(), standards: [deployedStandard] },
      [pkgA, pkgB],
      undefined,
      new Set([pkgA.id, pkgB.id]),
    );

    expect(result.flatMap((g) => g.standards)).toEqual([
      deployedStandard,
      deployedStandard,
    ]);
  });

  it('excludes packages that contain none of the target artifacts', () => {
    const recipe = recipeFactory();
    const deployedRecipe = createDeployedRecipeTargetInfo({ recipe });
    const matchingPackage = packageFactory({
      name: 'alpha',
      recipes: [recipe.id],
    });
    const unrelatedRecipe = recipeFactory();
    const unrelatedPackage = packageFactory({
      name: 'beta',
      recipes: [unrelatedRecipe.id],
    });

    const result = groupTargetByPackage(
      { ...buildEmptyTarget(), recipes: [deployedRecipe] },
      [matchingPackage, unrelatedPackage],
      undefined,
      new Set([matchingPackage.id, unrelatedPackage.id]),
    );

    expect(result.map((g) => g.pkg.name)).toEqual(['alpha']);
  });

  it('returns an empty array when the target has no artifacts', () => {
    const recipe = recipeFactory();
    const pkg = packageFactory({ name: 'alpha', recipes: [recipe.id] });

    const result = groupTargetByPackage(
      buildEmptyTarget(),
      [pkg],
      undefined,
      new Set(),
    );

    expect(result).toEqual([]);
  });

  it('returns an empty array when no packages are provided', () => {
    const recipe = recipeFactory();
    const deployedRecipe = createDeployedRecipeTargetInfo({ recipe });

    const result = groupTargetByPackage(
      { ...buildEmptyTarget(), recipes: [deployedRecipe] },
      [],
      undefined,
      new Set(),
    );

    expect(result).toEqual([]);
  });

  it('sorts groups alphabetically by package name', () => {
    const recipeOne = recipeFactory();
    const recipeTwo = recipeFactory();
    const standard = standardFactory();
    const skill = skillFactory();

    const deployedRecipeOne = createDeployedRecipeTargetInfo({
      recipe: recipeOne,
    });
    const deployedRecipeTwo = createDeployedRecipeTargetInfo({
      recipe: recipeTwo,
    });
    const deployedStandard = createDeployedStandardTargetInfo({ standard });
    const deployedSkill = buildDeployedSkillTargetInfo(skill);

    const zetaPackage = packageFactory({
      name: 'zeta',
      recipes: [recipeOne.id],
    });
    const middlePackage = packageFactory({
      name: 'mu',
      standards: [standard.id],
    });
    const alphaPackage = packageFactory({
      name: 'alpha',
      recipes: [recipeTwo.id],
      skills: [skill.id],
    });

    const result = groupTargetByPackage(
      {
        recipes: [deployedRecipeOne, deployedRecipeTwo],
        standards: [deployedStandard],
        skills: [deployedSkill],
      },
      [zetaPackage, middlePackage, alphaPackage],
      undefined,
      new Set([zetaPackage.id, middlePackage.id, alphaPackage.id]),
    );

    expect(result.map((g) => g.pkg.name)).toEqual(['alpha', 'mu', 'zeta']);
  });

  describe('with lookups', () => {
    it('computes pending arrays from package id lists minus deployed ids', () => {
      const deployedRecipe: Recipe = recipeFactory();
      const undeployedRecipe: Recipe = recipeFactory();
      const deployedStandard: Standard = standardFactory();
      const undeployedStandard: Standard = standardFactory();
      const deployedSkill: Skill = skillFactory();
      const undeployedSkill: Skill = skillFactory();

      const deployedRecipeInfo = createDeployedRecipeTargetInfo({
        recipe: deployedRecipe,
      });
      const deployedStandardInfo = createDeployedStandardTargetInfo({
        standard: deployedStandard,
      });
      const deployedSkillInfo = buildDeployedSkillTargetInfo(deployedSkill);

      const pkg: Package = packageFactory({
        name: 'alpha',
        recipes: [deployedRecipe.id, undeployedRecipe.id],
        standards: [deployedStandard.id, undeployedStandard.id],
        skills: [deployedSkill.id, undeployedSkill.id],
      });

      const result = groupTargetByPackage(
        {
          recipes: [deployedRecipeInfo],
          standards: [deployedStandardInfo],
          skills: [deployedSkillInfo],
        },
        [pkg],
        {
          recipesById: new Map<RecipeId, Recipe>([
            [deployedRecipe.id, deployedRecipe],
            [undeployedRecipe.id, undeployedRecipe],
          ]),
          standardsById: new Map<StandardId, Standard>([
            [deployedStandard.id, deployedStandard],
            [undeployedStandard.id, undeployedStandard],
          ]),
          skillsById: new Map<SkillId, Skill>([
            [deployedSkill.id, deployedSkill],
            [undeployedSkill.id, undeployedSkill],
          ]),
        },
        new Set([pkg.id]),
      );

      expect(result).toEqual([
        {
          pkg,
          recipes: [deployedRecipeInfo],
          standards: [deployedStandardInfo],
          skills: [deployedSkillInfo],
          pendingRecipes: [
            {
              id: undeployedRecipe.id,
              name: undeployedRecipe.name,
              slug: undeployedRecipe.slug,
            },
          ],
          pendingStandards: [
            {
              id: undeployedStandard.id,
              name: undeployedStandard.name,
              slug: undeployedStandard.slug,
            },
          ],
          pendingSkills: [
            {
              id: undeployedSkill.id,
              name: undeployedSkill.name,
              slug: undeployedSkill.slug,
            },
          ],
        },
      ]);
    });

    it('skips ids missing from the lookup map silently', () => {
      const knownRecipe: Recipe = recipeFactory();
      const unknownRecipe: Recipe = recipeFactory();

      const pkg: Package = packageFactory({
        name: 'alpha',
        recipes: [knownRecipe.id, unknownRecipe.id],
      });

      const result = groupTargetByPackage(
        buildEmptyTarget(),
        [pkg],
        {
          recipesById: new Map<RecipeId, Recipe>([
            [knownRecipe.id, knownRecipe],
          ]),
          standardsById: new Map<StandardId, Standard>(),
          skillsById: new Map<SkillId, Skill>(),
        },
        new Set([pkg.id]),
      );

      expect(result[0].pendingRecipes).toEqual([
        {
          id: knownRecipe.id,
          name: knownRecipe.name,
          slug: knownRecipe.slug,
        },
      ]);
    });

    it('drops a group whose package is not in the active set', () => {
      const recipe: Recipe = recipeFactory();
      const pkg: Package = packageFactory({
        name: 'alpha',
        recipes: [recipe.id],
      });

      const result = groupTargetByPackage(
        buildEmptyTarget(),
        [pkg],
        {
          recipesById: new Map<RecipeId, Recipe>([[recipe.id, recipe]]),
          standardsById: new Map<StandardId, Standard>(),
          skillsById: new Map<SkillId, Skill>(),
        },
        new Set(), // pkg is NOT in the active set
      );

      expect(result).toEqual([]);
    });

    it('drops a group when shared deployed artifacts would otherwise match an inactive package', () => {
      const recipe: Recipe = recipeFactory();
      const deployedRecipe = createDeployedRecipeTargetInfo({ recipe });
      const pkgA: Package = packageFactory({
        name: 'alpha',
        recipes: [recipe.id],
      });
      const pkgB: Package = packageFactory({
        name: 'beta',
        recipes: [recipe.id],
      });

      const result = groupTargetByPackage(
        { ...buildEmptyTarget(), recipes: [deployedRecipe] },
        [pkgA, pkgB],
        undefined,
        new Set([pkgA.id]), // only A is active for this target
      );

      expect(result.map((g) => g.pkg.name)).toEqual(['alpha']);
    });
  });
});
