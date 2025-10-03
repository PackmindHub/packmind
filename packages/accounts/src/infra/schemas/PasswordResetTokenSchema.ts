import { EntitySchema } from 'typeorm';
import {
  WithTimestamps,
  timestampsSchemas,
  uuidSchema,
} from '@packmind/shared';
import { PasswordResetTokenEntity } from '../../domain/entities/PasswordResetToken';

export const PasswordResetTokenSchema = new EntitySchema<
  WithTimestamps<PasswordResetTokenEntity>
>({
  name: 'PasswordResetToken',
  tableName: 'password_reset_tokens',
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
