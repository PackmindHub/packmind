import { EntitySchema } from 'typeorm';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/node-utils';
import { DetectionProgramMetadata, DetectionProgram } from '@packmind/types';

export const DetectionProgramMetadataSchema = new EntitySchema<
  WithSoftDelete<
    WithTimestamps<
      DetectionProgramMetadata & {
        detectionProgram?: DetectionProgram;
      }
    >
  >
>({
  name: 'DetectionProgramMetadata',
  tableName: 'detection_program_metadata',
  columns: {
    detectionProgramId: {
      name: 'detection_program_id',
      type: 'uuid',
      nullable: false,
    },
    taskId: {
      name: 'task_id',
      type: 'varchar',
      nullable: false,
    },
    tokens: {
      type: 'jsonb',
      nullable: true,
    },
    programDescription: {
      name: 'program_description',
      type: 'text',
      nullable: false,
    },
    ...uuidSchema,
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
  relations: {
    detectionProgram: {
      type: 'many-to-one',
      target: 'DetectionProgram',
      joinColumn: {
        name: 'detection_program_id',
      },
      onDelete: 'CASCADE',
    },
    logs: {
      type: 'one-to-many',
      target: 'ExecutionLog',
      inverseSide: 'detectionProgramMetadata',
    },
  },
  indices: [
    {
      name: 'idx_detection_program_metadata_detection_program_id',
      columns: ['detectionProgramId'],
    },
    {
      name: 'idx_detection_program_metadata_task_id',
      columns: ['taskId'],
    },
  ],
});
