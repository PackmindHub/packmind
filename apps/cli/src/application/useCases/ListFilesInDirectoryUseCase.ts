import { ListFiles } from '../services/ListFiles';
import { logErrorConsole } from '../../infra/utils/consoleLogger';

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

    const files = await this.listFiles.listFilesInDirectory(
      directoryPath,
      extensions,
      excludes,
    );

    const filesWithContent: ListFilesInDirectoryUseCaseResult = [];

    for (const file of files) {
      try {
        const content = await this.listFiles.readFileContent(file.path);
        filesWithContent.push({
          path: file.path,
          content,
        });
      } catch (error) {
        await logErrorConsole(`Error reading file ${file.path}: ${error}`);
      }
    }

    return filesWithContent;
  }
}
