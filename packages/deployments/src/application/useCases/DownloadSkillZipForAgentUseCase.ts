import archiver from 'archiver';
import { PassThrough } from 'stream';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { ICodingAgentDeployer } from '@packmind/coding-agent';
import {
  CodingAgent,
  DownloadSkillZipForAgentCommand,
  DownloadSkillZipForAgentResponse,
  FileModification,
  ICodingAgentPort,
  IDownloadSkillZipForAgentUseCase,
  ISkillsPort,
} from '@packmind/types';

const origin = 'DownloadSkillZipForAgentUseCase';

type FileWithContent = {
  path: string;
  content: string;
  isBase64?: boolean;
};

function hasContent(file: FileModification): file is FileWithContent {
  return 'content' in file && typeof file.content === 'string';
}

function getZipFileName(skillSlug: string, agent: CodingAgent): string {
  return `${skillSlug}-${agent}.zip`;
}

export class DownloadSkillZipForAgentUseCase implements IDownloadSkillZipForAgentUseCase {
  constructor(
    private readonly codingAgentPort: ICodingAgentPort,
    private readonly skillsPort: ISkillsPort,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {}

  async execute(
    command: DownloadSkillZipForAgentCommand,
  ): Promise<DownloadSkillZipForAgentResponse> {
    const { skillId, agent } = command;

    this.logger.info('Downloading skill zip for agent', { skillId, agent });

    const latestVersion = await this.skillsPort.getLatestSkillVersion(skillId);

    if (!latestVersion) {
      this.logger.error('Skill version not found', { skillId });
      return {
        fileName: `skill-${agent}.zip`,
        fileContent: '',
      };
    }

    const files = await this.skillsPort.getSkillFiles(latestVersion.id);
    const skillVersionWithFiles = { ...latestVersion, files };

    const deployerRegistry = this.codingAgentPort.getDeployerRegistry();
    const deployer = deployerRegistry.getDeployer(
      agent,
    ) as ICodingAgentDeployer;

    const fileUpdates = await deployer.generateFileUpdatesForSkills([
      skillVersionWithFiles,
    ]);
    const filesWithContent = fileUpdates.createOrUpdate.filter(hasContent);

    const zipBuffer = await this.createZipFromFileUpdates(filesWithContent);
    const base64Content = zipBuffer.toString('base64');

    this.logger.info('Skill zip file created for agent', {
      skillId,
      agent,
      fileCount: filesWithContent.length,
      zipSizeBytes: zipBuffer.length,
    });

    return {
      fileName: getZipFileName(latestVersion.slug, agent),
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
