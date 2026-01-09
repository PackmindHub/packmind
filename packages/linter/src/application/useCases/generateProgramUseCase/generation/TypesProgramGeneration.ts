import { SourceCodeState } from '@packmind/types';

export type Program = {
  program: string;
  programFound: boolean;
  sourceCodeState: SourceCodeState;
};

export class PackmindTimeoutError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = 'PackmindTimeoutError';
  }
}
