import {
  IUploadSkillUseCase,
  UploadSkillCommand,
  UploadSkillResult,
} from '../../domain/useCases/IUploadSkillUseCase';
import { readSkillDirectory } from '../../infra/utils/readSkillDirectory';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { createSpaceId } from '@packmind/types';

type IIUploadSkillDependencies = {
  gateway: IPackmindGateway;
};

export class UploadSkillUseCase implements IUploadSkillUseCase {
  constructor(private readonly deps: IIUploadSkillDependencies) {}

  async execute(command: UploadSkillCommand): Promise<UploadSkillResult> {
    // Step 2: Read all files from skill directory
    const files = await readSkillDirectory(command.skillPath);

    // Validate SKILL.md exists
    if (!files.find((f) => f.relativePath === 'SKILL.md')) {
      throw new Error('SKILL.md not found in skill directory');
    }

    // Validate file count
    const MAX_FILES = 100;
    if (files.length > MAX_FILES) {
      throw new Error(
        `Skill contains ${files.length} files, but maximum allowed is ${MAX_FILES}`,
      );
    }

    // Calculate total size
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > 10 * 1024 * 1024) {
      throw new Error(`Skill size (${totalSize} bytes) exceeds 10MB limit`);
    }

    const space = await this.deps.gateway.spaces.getGlobal();
    const payload = {
      files: files.map((f) => ({
        path: f.relativePath,
        content: f.content,
        permissions: f.permissions || 'rw-r--r--',
        isBase64: f.isBase64,
      })),
    };
    const uploadSkillResponse = await this.deps.gateway.skills.upload({
      spaceId: createSpaceId(space.id),
      files: payload.files,
      originSkill: command.originSkill,
    });

    return {
      skillId: uploadSkillResponse.skill.id,
      name: uploadSkillResponse.skill.name,
      version: uploadSkillResponse.skill.version,
      isNewSkill: uploadSkillResponse.versionCreated,
      versionCreated: uploadSkillResponse.versionCreated,
      fileCount: files.length,
      totalSize,
    };
  }
}
