import { EntitySchema } from 'typeorm';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/node-utils';
import { ExecutionLog, DetectionProgramMetadata } from '@packmind/types';

export const ExecutionLogSchema = new EntitySchema<
  WithSoftDelete<
    WithTimestamps<
      ExecutionLog & {
        id: string;
        detectionProgramMetadataId: string;
        detectionProgramMetadata?: DetectionProgramMetadata;
      }
    >
  >
>({
  name: 'ExecutionLog',
  tableName: 'execution_logs',
  columns: {
    detectionProgramMetadataId: {
      name: 'detection_program_metadata_id',
      type: 'uuid',
      nullable: false,
    },
    timestamp: {
      type: 'bigint',
      nullable: false,
    },
    message: {
      type: 'text',
      nullable: false,
    },
    metadata: {
      type: 'jsonb',
      nullable: true,
    },
    ...uuidSchema,
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
  relations: {
    detectionProgramMetadata: {
      type: 'many-to-one',
      target: 'DetectionProgramMetadata',
      joinColumn: {
        name: 'detection_program_metadata_id',
      },
      onDelete: 'CASCADE',
    },
  },
  indices: [
    {
      name: 'idx_execution_logs_detection_program_metadata_id',
      columns: ['detectionProgramMetadataId'],
    },
    {
      name: 'idx_execution_logs_timestamp',
      columns: ['timestamp'],
    },
  ],
});
