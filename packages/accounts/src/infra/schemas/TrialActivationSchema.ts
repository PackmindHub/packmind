import { EntitySchema } from 'typeorm';
import {
  WithTimestamps,
  timestampsSchemas,
  uuidSchema,
} from '@packmind/node-utils';
import { TrialActivation } from '../../domain/entities/TrialActivationToken';

export const TrialActivationSchema = new EntitySchema<
  WithTimestamps<TrialActivation>
>({
  name: 'TrialActivation',
  tableName: 'trial_activations',
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
