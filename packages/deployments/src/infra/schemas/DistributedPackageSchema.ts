import { EntitySchema } from 'typeorm';
import { DistributedPackage } from '@packmind/types';
import { uuidSchema } from '@packmind/node-utils';

export const DistributedPackageSchema = new EntitySchema<DistributedPackage>({
  name: 'DistributedPackage',
  tableName: 'distributed_packages',
  columns: {
    distributionId: {
      name: 'distribution_id',
      type: 'uuid',
    },
    packageId: {
      name: 'package_id',
      type: 'uuid',
    },
    operation: {
      type: 'varchar',
      nullable: false,
      default: 'add',
    },
    ...uuidSchema,
  },
  relations: {
    distribution: {
      type: 'many-to-one',
      target: 'Distribution',
      joinColumn: {
        name: 'distribution_id',
        referencedColumnName: 'id',
      },
      onDelete: 'CASCADE',
    },
    package: {
      type: 'many-to-one',
      target: 'Package',
      joinColumn: {
        name: 'package_id',
        referencedColumnName: 'id',
      },
      onDelete: 'CASCADE',
    },
    standardVersions: {
      type: 'many-to-many',
      target: 'StandardVersion',
      joinTable: {
        name: 'distributed_package_standard_versions',
        joinColumn: {
          name: 'distributed_package_id',
          referencedColumnName: 'id',
        },
        inverseJoinColumn: {
          name: 'standard_version_id',
          referencedColumnName: 'id',
        },
      },
    },
    recipeVersions: {
      type: 'many-to-many',
      target: 'RecipeVersion',
      joinTable: {
        name: 'distributed_package_recipe_versions',
        joinColumn: {
          name: 'distributed_package_id',
          referencedColumnName: 'id',
        },
        inverseJoinColumn: {
          name: 'recipe_version_id',
          referencedColumnName: 'id',
        },
      },
    },
    skillVersions: {
      type: 'many-to-many',
      target: 'SkillVersion',
      joinTable: {
        name: 'distributed_package_skill_versions',
        joinColumn: {
          name: 'distributed_package_id',
          referencedColumnName: 'id',
        },
        inverseJoinColumn: {
          name: 'skill_version_id',
          referencedColumnName: 'id',
        },
      },
    },
  },
  indices: [
    {
      name: 'idx_distributed_package_distribution',
      columns: ['distributionId'],
    },
  ],
});
