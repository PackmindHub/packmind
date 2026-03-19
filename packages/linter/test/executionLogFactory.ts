import { Factory } from '@packmind/test-utils';
import { ExecutionLog } from '@packmind/types';

export const executionLogFactory: Factory<ExecutionLog> = (
  log?: Partial<ExecutionLog>,
) => {
  return {
    timestamp: Date.now(),
    message: 'Test execution log message',
    metadata: undefined,
    ...log,
  };
};
