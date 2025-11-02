import { TestApp } from './TestApp';
import {
  Recipe,
  RecipeVersion,
  RecipeVersionId,
  Standard,
  StandardVersion,
  StandardVersionId,
} from '@packmind/shared';

export class DataQuery {
  constructor(private readonly testApp: TestApp) {}

  async getStandardVersion(
    standard: Standard,
    version?: number,
  ): Promise<StandardVersion> {
    const standardVersions =
      await this.testApp.standardsHexa.listStandardVersions(standard.id);
    const expectedVersion = version ?? standard.version;
    for (const standardVersion of standardVersions) {
      if (standardVersion.version === expectedVersion) {
        return standardVersion;
      }
    }

    throw new Error('No standard version found');
  }

  async getStandardVersionId(
    standard: Standard,
    version?: number,
  ): Promise<StandardVersionId> {
    const standardVersion = await this.getStandardVersion(standard, version);
    return standardVersion.id;
  }

  async getRecipeVersion(
    recipe: Recipe,
    version?: number,
  ): Promise<RecipeVersion> {
    const recipeVersions = await this.testApp.recipesHexa.listRecipeVersions(
      recipe.id,
    );
    const expectedVersion = version ?? recipe.version;

    console.log({ recipeVersions, expectedVersion });

    for (const recipeVersion of recipeVersions) {
      if (recipeVersion.version === expectedVersion) {
        return recipeVersion;
      }
    }

    throw new Error(
      `No version ${expectedVersion} found for recipe "${recipe.name}"`,
    );
  }

  async getRecipeVersionId(
    recipe: Recipe,
    version?: number,
  ): Promise<RecipeVersionId> {
    const recipeVersion = await this.getRecipeVersion(recipe, version);
    return recipeVersion.id;
  }
}
