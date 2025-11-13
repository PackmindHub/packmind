import { SpaceId } from '../spaces';
import { UserId } from '../accounts';
import { RecipeId } from '../recipes';
import { StandardId } from '../standards';
import { Branded, brandedIdFactory } from '../brandedTypes';

export type PackageId = Branded<'PackageId'>;
export const createPackageId = brandedIdFactory<PackageId>();

export type Package = {
  id: PackageId;
  name: string;
  slug: string;
  description: string;
  spaceId: SpaceId;
  createdBy: UserId;
  recipes: RecipeId[];
  standards: StandardId[];
};
