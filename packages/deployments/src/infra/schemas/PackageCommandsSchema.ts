import { EntitySchema } from 'typeorm';

export interface PackageCommand {
  package_id: string;
  recipe_id: string;
}

export const PackageCommandsSchema = new EntitySchema<PackageCommand>({
  name: 'PackageCommand',
  tableName: 'package_commands',
  columns: {
    package_id: {
      type: 'uuid',
      primary: true,
      nullable: false,
    },
    recipe_id: {
      // TS property kept as recipe_id (wire/internal); physical column renamed
      name: 'command_id',
      type: 'uuid',
      primary: true,
      nullable: false,
    },
  },
});
