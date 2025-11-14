import { EntitySchema } from 'typeorm';
import { Package } from '@packmind/types';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/node-utils';

export const PackageSchema = new EntitySchema<
  WithSoftDelete<WithTimestamps<Package>>
>({
  name: 'Package',
  tableName: 'packages',
  columns: {
    name: {
      type: 'varchar',
      nullable: false,
    },
    slug: {
      type: 'varchar',
      nullable: false,
    },
    description: {
      type: 'text',
      nullable: false,
    },
    spaceId: {
      name: 'space_id',
      type: 'uuid',
      nullable: false,
    },
    createdBy: {
      name: 'created_by',
      type: 'varchar',
      nullable: false,
    },
    ...uuidSchema,
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
  relations: {
    recipes: {
      type: 'many-to-many',
      target: 'Recipe',
      joinTable: {
        name: 'package_recipes',
        joinColumn: {
          name: 'package_id',
          referencedColumnName: 'id',
        },
        inverseJoinColumn: {
          name: 'recipe_id',
          referencedColumnName: 'id',
        },
      },
    },
    standards: {
      type: 'many-to-many',
      target: 'Standard',
      joinTable: {
        name: 'package_standards',
        joinColumn: {
          name: 'package_id',
          referencedColumnName: 'id',
        },
        inverseJoinColumn: {
          name: 'standard_id',
          referencedColumnName: 'id',
        },
      },
    },
  },
});
