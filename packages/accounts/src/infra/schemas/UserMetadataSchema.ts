import { EntitySchema } from 'typeorm';
import { UserMetadata } from '@packmind/types';
import {
  WithTimestamps,
  timestampsSchemas,
  uuidSchema,
} from '@packmind/node-utils';

export const UserMetadataSchema = new EntitySchema<
  WithTimestamps<UserMetadata>
>({
  name: 'UserMetadata',
  tableName: 'user_metadata',
  columns: {
    ...uuidSchema,
    userId: {
      name: 'user_id',
      type: 'uuid',
      nullable: false,
    },
    onboardingCompleted: {
      name: 'onboarding_completed',
      type: 'boolean',
      default: false,
    },
    socialProviders: {
      name: 'social_providers',
      type: 'text',
      array: true,
      default: () => "'{}'",
    },
    ...timestampsSchemas,
  },
});
