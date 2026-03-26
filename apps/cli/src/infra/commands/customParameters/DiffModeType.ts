import { Type } from 'cmd-ts';
import { DiffMode } from '../../../domain/entities/DiffMode';

export const DiffModeType: Type<string, DiffMode> = {
  from: async (input) => {
    switch (input) {
      case 'files':
        return DiffMode.FILES;
      case 'lines':
        return DiffMode.LINES;
    }
    throw new Error(
      `${input} is not a valid value for the --diff option. Expected values are: files, lines`,
    );
  },
};
