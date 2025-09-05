import { EntitySchema } from 'typeorm';
import { Organization } from '../../domain/entities/Organization';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/shared';

export const OrganizationSchema = new EntitySchema<
  WithSoftDelete<WithTimestamps<Organization>>
>({
  name: 'Organization',
  tableName: 'organizations',
  columns: {
    name: {
      type: 'varchar',
      length: 255,
      unique: true,
    },
    slug: {
      type: 'varchar',
      length: 255,
      unique: true,
    },
    ...uuidSchema,
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
});
