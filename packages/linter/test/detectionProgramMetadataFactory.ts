import { Factory } from '@packmind/test-utils';
import {
  DetectionProgramMetadata,
  createDetectionProgramId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

export const detectionProgramMetadataFactory: Factory<
  DetectionProgramMetadata
> = (metadata?: Partial<DetectionProgramMetadata>) => {
  return {
    id: uuidv4(),
    detectionProgramId: createDetectionProgramId(uuidv4()),
    taskId: `task-${uuidv4()}`,
    tokens: null,
    logs: null,
    programDescription: 'Test program description',
    ...metadata,
  };
};
