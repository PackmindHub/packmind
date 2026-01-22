import { IUseCase, PackmindCommand } from '../../UseCase';

export type DownloadDefaultSkillsZipFileCommand = PackmindCommand;

export type DownloadDefaultSkillsZipFileResponse = {
  fileName: string;
  fileContent: string;
};

export type IDownloadDefaultSkillsZipFileUseCase = IUseCase<
  DownloadDefaultSkillsZipFileCommand,
  DownloadDefaultSkillsZipFileResponse
>;
