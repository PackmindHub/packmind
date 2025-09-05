import { ListFiles } from '../services/ListFiles';

export type ListFilesInDirectoryUseCaseCommand = {
  path: string;
  extensions: string[];
  excludes?: string[];
};

export type ListFilesInDirectoryUseCaseResult = {
  path: string;
  content: string;
}[];

export class ListFilesInDirectoryUseCase {
  constructor(private readonly listFiles: ListFiles = new ListFiles()) {}

  public async execute(
    command: ListFilesInDirectoryUseCaseCommand,
  ): Promise<ListFilesInDirectoryUseCaseResult> {
    const { path: directoryPath, extensions, excludes = [] } = command;

    return this.listFiles.listFilesInDirectory(
      directoryPath,
      extensions,
      excludes,
    );
  }
}
