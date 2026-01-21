import archiver from 'archiver';
import { PassThrough } from 'stream';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  DownloadDefaultSkillsZipFileCommand,
  DownloadDefaultSkillsZipFileResponse,
  FileModification,
  IAccountsPort,
} from '@packmind/types';
import { DeployDefaultSkillsUseCase } from './DeployDefaultSkillsUseCase';

const origin = 'DownloadDefaultSkillsZipFileUseCase';
const DEFAULT_SKILLS_ZIP_FILE_NAME = 'packmind-default-skills.zip';

type FileWithContent = {
  path: string;
  content: string;
  isBase64?: boolean;
};

function hasContent(file: FileModification): file is FileWithContent {
  return 'content' in file && typeof file.content === 'string';
}

export class DownloadDefaultSkillsZipFileUseCase extends AbstractMemberUseCase<
  DownloadDefaultSkillsZipFileCommand,
  DownloadDefaultSkillsZipFileResponse
> {
  constructor(
    private readonly deployDefaultSkillsUseCase: DeployDefaultSkillsUseCase,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin, LogLevel.INFO),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: DownloadDefaultSkillsZipFileCommand & MemberContext,
  ): Promise<DownloadDefaultSkillsZipFileResponse> {
    this.logger.info('Downloading default skills zip file', {
      organizationId: command.organizationId,
      userId: command.userId,
    });

    const { fileUpdates } = await this.deployDefaultSkillsUseCase.execute({
      userId: command.userId,
      organizationId: command.organizationId,
    });

    const filesWithContent = fileUpdates.createOrUpdate.filter(hasContent);
    const zipBuffer = await this.createZipFromFileUpdates(filesWithContent);
    const base64Content = zipBuffer.toString('base64');

    this.logger.info('Default skills zip file created', {
      organizationId: command.organizationId,
      fileCount: filesWithContent.length,
      zipSizeBytes: zipBuffer.length,
    });

    return {
      fileName: DEFAULT_SKILLS_ZIP_FILE_NAME,
      fileContent: base64Content,
    };
  }

  private async createZipFromFileUpdates(
    files: FileWithContent[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const passthrough = new PassThrough();

      passthrough.on('data', (chunk: Buffer) => chunks.push(chunk));
      passthrough.on('end', () => resolve(Buffer.concat(chunks)));
      passthrough.on('error', reject);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', reject);
      archive.pipe(passthrough);

      for (const file of files) {
        const content = file.isBase64
          ? Buffer.from(file.content, 'base64')
          : Buffer.from(file.content, 'utf8');
        archive.append(content, { name: file.path });
      }

      archive.finalize();
    });
  }
}
