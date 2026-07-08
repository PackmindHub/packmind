import { EntitySchema } from 'typeorm';

export interface PackageCommand {
  package_id: string;
  recipe_id: string;
}

export const PackageCommandsSchema = new EntitySchema<PackageCommand>({
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
