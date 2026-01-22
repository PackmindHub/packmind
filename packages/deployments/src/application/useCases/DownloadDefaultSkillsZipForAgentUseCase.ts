import archiver from 'archiver';
import { PassThrough } from 'stream';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { ICodingAgentDeployer } from '@packmind/coding-agent';
import {
  CodingAgent,
  DownloadDefaultSkillsZipForAgentCommand,
  DownloadDefaultSkillsZipForAgentResponse,
  FileModification,
  ICodingAgentPort,
  IDownloadDefaultSkillsZipForAgentUseCase,
} from '@packmind/types';

const origin = 'DownloadDefaultSkillsZipForAgentUseCase';

type FileWithContent = {
  path: string;
  content: string;
  isBase64?: boolean;
};

function hasContent(file: FileModification): file is FileWithContent {
  return 'content' in file && typeof file.content === 'string';
}

function getZipFileName(agent: CodingAgent): string {
  return `packmind-${agent}-default-skills.zip`;
}

export class DownloadDefaultSkillsZipForAgentUseCase implements IDownloadDefaultSkillsZipForAgentUseCase {
  private readonly logger: PackmindLogger;

  constructor(private readonly codingAgentPort: ICodingAgentPort) {
    this.logger = new PackmindLogger(origin, LogLevel.INFO);
  }

  async execute(
    command: DownloadDefaultSkillsZipForAgentCommand,
  ): Promise<DownloadDefaultSkillsZipForAgentResponse> {
    const { agent } = command;

    this.logger.info('Downloading default skills zip for agent', { agent });

    const deployerRegistry = this.codingAgentPort.getDeployerRegistry();
    const deployer = deployerRegistry.getDeployer(
      agent,
    ) as ICodingAgentDeployer;

    if (!deployer.deployDefaultSkills) {
      this.logger.info('Agent does not support default skills', { agent });
      return {
        fileName: getZipFileName(agent),
        fileContent: '',
      };
    }

    const fileUpdates = await deployer.deployDefaultSkills();
    const filesWithContent = fileUpdates.createOrUpdate.filter(hasContent);
    const zipBuffer = await this.createZipFromFileUpdates(filesWithContent);
    const base64Content = zipBuffer.toString('base64');

    this.logger.info('Default skills zip file created for agent', {
      agent,
      fileCount: filesWithContent.length,
      zipSizeBytes: zipBuffer.length,
    });

    return {
      fileName: getZipFileName(agent),
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
