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

/**
 * Whether a package carries content that can become a marketplace plugin.
 *
 * Standards are intentionally excluded from plugin rendering, so a package
 * made of standards only would produce an empty (manifest-only) plugin. A
 * package is therefore publishable as a plugin iff it has at least one skill
 * or one recipe.
 *
 * Single source of truth shared by the frontend gate, the synchronous publish
 * use case, the publish job (re-checked at render time), and the
 * degrade-to-removal cascade. Accepts any object exposing skill/recipe arrays
 * so both `Package` (id arrays) and `PackageWithArtefacts` (entity arrays)
 * satisfy it.
 */
export const isPackagePublishableAsPlugin = (pkg: {
  skills?: unknown[];
  recipes?: unknown[];
}): boolean => (pkg.skills?.length ?? 0) > 0 || (pkg.recipes?.length ?? 0) > 0;
