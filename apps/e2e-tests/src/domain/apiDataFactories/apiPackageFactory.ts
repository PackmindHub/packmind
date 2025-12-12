import { IPackmindApi } from '../api/IPackmindApi';
import { packageFactory } from '@packmind/deployments/test';
import { RecipeId, Package, StandardId } from '@packmind/types';

export async function apiPackageFactory(
  packmindApi: IPackmindApi,
  data?: Partial<{ standardIds: StandardId[]; recipesIds: RecipeId[] }>,
): Promise<Package> {
  const spaces = await packmindApi.listSpaces();
  const spaceId = spaces[0].id;
  const packageData = packageFactory({ spaceId });

  const response = await packmindApi.createPackage({
    ...packageData,
    standardIds: data?.standardIds ?? [],
    recipeIds: data?.recipesIds ?? [],
  });

  return response.package;
}
