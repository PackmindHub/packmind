import { Type } from 'cmd-ts';
import { DetectionSeverity } from '@packmind/types';

export const LevelType: Type<string, DetectionSeverity> = {
  from: async (input) => {
    switch (input) {
      case 'error':
        return DetectionSeverity.ERROR;
      case 'warning':
        return DetectionSeverity.WARNING;
    }
    throw new Error(
      `${input} is not a valid value for the --level option. Expected values are: error, warning`,
    );
  },
};
