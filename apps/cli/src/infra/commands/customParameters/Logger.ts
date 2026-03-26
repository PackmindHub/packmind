import { Type } from 'cmd-ts';
import { Loggers } from '../lintHandler';

export const Logger: Type<string, Loggers> = {
  from: async (input) => {
    switch (input) {
      case 'ide':
        return Loggers.ide;
      case 'human':
        return Loggers.human;
    }
    throw new Error(
      `${input} is not a valid value for the --logger option. Expected values are: ide, human`,
    );
  },
};
