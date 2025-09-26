import { EntitySchema } from 'typeorm';
import {
  WithTimestamps,
  timestampsSchemas,
  uuidSchema,
} from '@packmind/shared';
import { Invitation } from '../../domain/entities/Invitation';

export const InvitationSchema = new EntitySchema<WithTimestamps<Invitation>>({
  name: 'Invitation',
  tableName: 'invitations',
  columns: {
    ...uuidSchema,
    userId: {
      name: 'user_id',
      type: 'uuid',
      nullable: false,
    },
    token: {
      type: 'varchar',
      length: 512,
    },
    expirationDate: {
      name: 'expiration_date',
      type: 'timestamptz',
    },
    ...timestampsSchemas,
  },
});
