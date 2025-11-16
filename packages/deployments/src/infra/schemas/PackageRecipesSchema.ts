import { EntitySchema } from 'typeorm';

export interface PackageRecipe {
  package_id: string;
  recipe_id: string;
}

export const PackageRecipesSchema = new EntitySchema<PackageRecipe>({
  name: 'PackageRecipe',
  tableName: 'package_recipes',
  columns: {
    package_id: {
      type: 'uuid',
      primary: true,
      nullable: false,
    },
    recipe_id: {
      type: 'uuid',
      primary: true,
      nullable: false,
    },
  },
});
