import archiver from 'archiver';
import { PassThrough } from 'stream';
import { PackmindLogger } from '@packmind/logger';
import {
  FileModification,
  PreviewArtifactRenderingCommand,
  PreviewArtifactRenderingResponse,
} from '@packmind/types';
import { ICodingAgentRepositories } from '../../domain/repositories/ICodingAgentRepositories';

const origin = 'PreviewArtifactRenderingUseCase';

type FileWithContent = {
  path: string;
  content: string;
  isBase64?: boolean;
};

function hasContent(file: FileModification): file is FileWithContent {
  return 'content' in file && typeof file.content === 'string';
}

export class PreviewArtifactRenderingUseCase {
  constructor(
    private readonly codingAgentRepositories: ICodingAgentRepositories,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: PreviewArtifactRenderingCommand,
  ): Promise<PreviewArtifactRenderingResponse> {
    const { codingAgent } = command;

    this.logger.info('Previewing artifact rendering for agent', {
      codingAgent,
      recipesCount: command.recipeVersions.length,
      standardsCount: command.standardVersions.length,
      skillsCount: command.skillVersions.length,
    });

    const deployer = this.codingAgentRepositories
      .getDeployerRegistry()
      .getDeployer(codingAgent);

    const fileUpdates = await deployer.deployArtifacts(
      command.recipeVersions,
      command.standardVersions,
      command.skillVersions,
    );

    const filesWithContent = fileUpdates.createOrUpdate.filter(hasContent);

    const zipBuffer = await this.createZipFromFiles(filesWithContent);
    const base64Content = zipBuffer.toString('base64');

    const fileName = `packmind-${codingAgent}-preview.zip`;

    this.logger.info('Preview rendering zip created', {
      codingAgent,
      fileCount: filesWithContent.length,
      zipSizeBytes: zipBuffer.length,
    });

    return { fileName, fileContent: base64Content };
  }

  private async createZipFromFiles(files: FileWithContent[]): Promise<Buffer> {
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
