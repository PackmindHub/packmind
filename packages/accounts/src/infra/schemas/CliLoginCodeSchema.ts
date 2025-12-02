import { EntitySchema } from 'typeorm';
import {
  WithTimestamps,
  timestampsSchemas,
  uuidSchema,
} from '@packmind/node-utils';
import { CliLoginCode } from '../../domain/entities/CliLoginCode';

export const CliLoginCodeSchema = new EntitySchema<
  WithTimestamps<CliLoginCode>
>({
  name: 'CliLoginCode',
  tableName: 'cli_login_codes',
  columns: {
    ...uuidSchema,
    code: {
      type: 'varchar',
      length: 512,
      unique: true,
    },
    userId: {
      name: 'user_id',
      type: 'uuid',
      nullable: false,
    },
    organizationId: {
      name: 'organization_id',
      type: 'uuid',
      nullable: false,
    },
    expiresAt: {
      name: 'expires_at',
      type: 'timestamptz',
      nullable: false,
    },
    ...timestampsSchemas,
  },
});
