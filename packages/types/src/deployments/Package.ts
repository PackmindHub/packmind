import { SpaceId } from '../spaces';
import { UserId } from '../accounts';
import { Command, CommandId } from '../commands';
import { Standard, StandardId } from '../standards';
import { Branded, brandedIdFactory } from '../brandedTypes';
import { Skill, SkillId } from '../skills';

export type PackageId = Branded<'PackageId'>;
export const createPackageId = brandedIdFactory<PackageId>();

export type Package = {
  id: PackageId;
  name: string;
  slug: string;
  description: string;
  spaceId: SpaceId;
  createdBy: UserId;
  recipes: CommandId[];
  standards: StandardId[];
  skills: SkillId[];
};

export type PackageWithArtefacts = Omit<
  Package,
  'recipes' | 'standards' | 'skills'
> & {
  recipes: Command[];
  standards: Standard[];
  skills: Skill[];
};
