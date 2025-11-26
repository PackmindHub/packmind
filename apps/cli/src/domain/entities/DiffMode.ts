export enum DiffMode {
  FILES = 'files',
  LINES = 'lines',
}

export type ModifiedLine = {
  file: string; // Absolute path
  startLine: number;
  lineCount: number;
};
