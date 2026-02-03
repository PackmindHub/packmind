export type FileResult = {
  path: string;
};

export interface IListFiles {
  listFilesInDirectory(
    directoryPath: string,
    extensions: string[],
    excludes: string[],
    skipHidden?: boolean,
  ): Promise<FileResult[]>;

  readFileContent(filePath: string): Promise<string>;
}
