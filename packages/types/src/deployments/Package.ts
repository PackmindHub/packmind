import { SpaceId } from '../spaces';
import { UserId } from '../accounts';
import { Recipe } from '../recipes';
import { Standard } from '../standards';
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
  recipes: Recipe[];
  standards: Standard[];
};
