import { EntitySchema } from 'typeorm';
import {
  WithSoftDelete,
  WithTimestamps,
  softDeleteSchemas,
  timestampsSchemas,
  uuidSchema,
} from '@packmind/node-utils';
import { RenderModeConfiguration } from '@packmind/types';

export const RenderModeConfigurationSchema = new EntitySchema<
  WithSoftDelete<WithTimestamps<RenderModeConfiguration>>
>({
  name: 'RenderModeConfiguration',
  tableName: 'render_mode_configurations',
  columns: {
    ...uuidSchema,
    organizationId: {
      name: 'organization_id',
      type: 'uuid',
      nullable: false,
      unique: true,
    },
    activeRenderModes: {
      name: 'active_render_modes',
      type: 'text',
      array: true,
      nullable: false,
    },
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
});
