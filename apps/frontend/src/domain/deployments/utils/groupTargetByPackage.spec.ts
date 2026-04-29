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
  Skill,
  Standard,
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
    );

    expect(result).toEqual([
      {
        pkg,
        recipes: [deployedRecipe],
        standards: [],
        skills: [],
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
    );

    expect(result.map((g) => g.pkg.name)).toEqual(['alpha']);
  });

  it('returns an empty array when the target has no artifacts', () => {
    const recipe = recipeFactory();
    const pkg = packageFactory({ name: 'alpha', recipes: [recipe.id] });

    const result = groupTargetByPackage(buildEmptyTarget(), [pkg]);

    expect(result).toEqual([]);
  });

  it('returns an empty array when no packages are provided', () => {
    const recipe = recipeFactory();
    const deployedRecipe = createDeployedRecipeTargetInfo({ recipe });

    const result = groupTargetByPackage(
      { ...buildEmptyTarget(), recipes: [deployedRecipe] },
      [],
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
    );

    expect(result.map((g) => g.pkg.name)).toEqual(['alpha', 'mu', 'zeta']);
  });
});
