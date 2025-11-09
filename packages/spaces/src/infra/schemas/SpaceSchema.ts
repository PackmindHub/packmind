import {
  WithSoftDelete,
  WithTimestamps,
  softDeleteSchemas,
  timestampsSchemas,
  uuidSchema,
} from '@packmind/node-utils';
import { Space } from '@packmind/types';
import { EntitySchema } from 'typeorm';

export const SpaceSchema = new EntitySchema<
  WithSoftDelete<WithTimestamps<Space>>
>({
  name: 'Space',
  tableName: 'spaces',
  columns: {
    name: {
      type: 'varchar',
      length: 255,
    },
    slug: {
      type: 'varchar',
      length: 255,
    },
    organizationId: {
      name: 'organization_id',
      type: 'uuid',
      nullable: false,
    },
    ...uuidSchema,
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
  indices: [
    {
      name: 'idx_space_organization',
      columns: ['organizationId'],
    },
    {
      name: 'idx_space_slug',
      columns: ['slug', 'organizationId'],
      unique: true,
      where: 'deleted_at IS NULL',
    },
  ],
});
