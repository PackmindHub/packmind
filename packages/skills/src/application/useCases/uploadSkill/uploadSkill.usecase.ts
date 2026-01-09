import { LogLevel, PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  UploadSkillCommand,
  UploadSkillResponse,
  SkillCreatedEvent,
  createOrganizationId,
  createSkillId,
  createUserId,
  createSkillVersionId,
  createSkillFileId,
  SkillFile,
  createSpaceId,
} from '@packmind/types';
import slug from 'slug';
import { v4 as uuidv4 } from 'uuid';
import { IUploadSkill } from '../../../domain/useCases/IUploadSkill';
import { SkillService } from '../../services/SkillService';
import { SkillVersionService } from '../../services/SkillVersionService';
import { SkillParser } from '../../parser/SkillParser';
import { SkillValidator } from '../../validator/SkillValidator';
import { ISkillFileRepository } from '../../../domain/repositories/ISkillFileRepository';
import { SkillParseError } from '../../errors/SkillParseError';
import { SkillValidationError } from '../../errors/SkillValidationError';

const origin = 'UploadSkillUsecase';

export class UploadSkillUsecase implements IUploadSkill {
  private readonly skillParser: SkillParser;
  private readonly skillValidator: SkillValidator;

  constructor(
    private readonly skillService: SkillService,
    private readonly skillVersionService: SkillVersionService,
    private readonly skillFileRepository: ISkillFileRepository,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.skillParser = new SkillParser();
    this.skillValidator = new SkillValidator();
    this.logger.info('UploadSkillUsecase initialized');
  }

  public async execute(
    command: UploadSkillCommand,
  ): Promise<UploadSkillResponse> {
    const {
      files,
      organizationId: orgIdString,
      userId: userIdString,
      spaceId: spaceIdString,
    } = command;
    const organizationId = createOrganizationId(orgIdString);
    const userId = createUserId(userIdString);
    const spaceId = createSpaceId(spaceIdString);

    this.logger.info('Starting uploadSkill process', {
      fileCount: files.length,
      organizationId,
      userId,
      spaceId,
    });

    try {
      // Find SKILL.md file
      this.logger.info('Looking for SKILL.md file');
      const skillMdFile = files.find((f) => f.path === 'SKILL.md');
      if (!skillMdFile) {
        throw new SkillParseError('SKILL.md not found in uploaded files');
      }
      this.logger.info('SKILL.md file found');

      // Parse SKILL.md
      this.logger.info('Parsing SKILL.md content');
      const parsedSkill = this.skillParser.parse(skillMdFile.content);
      this.logger.info('SKILL.md parsed successfully', {
        name: parsedSkill.metadata.name,
      });

      // Validate metadata
      this.logger.info('Validating skill metadata');
      const validationErrors = this.skillValidator.validate(
        parsedSkill.metadata,
      );
      if (validationErrors.length > 0) {
        this.logger.error('Skill metadata validation failed', {
          errors: validationErrors,
        });
        throw new SkillValidationError(validationErrors);
      }
      this.logger.info('Skill metadata validation passed');

      const {
        name,
        description,
        license,
        compatibility,
        metadata,
        allowedTools,
      } = parsedSkill.metadata;
      const prompt = parsedSkill.body;

      // Generate slug
      this.logger.info('Generating slug from skill name', { name });
      const baseSlug = slug(name);
      this.logger.info('Base slug generated', { slug: baseSlug });

      // Ensure slug is unique per space
      this.logger.info('Checking slug uniqueness within space', {
        baseSlug,
        spaceId,
      });
      const existingSkills = await this.skillService.listSkillsBySpace(spaceId);
      const existingSlugs = new Set(existingSkills.map((s) => s.slug));

      let skillSlug = baseSlug;
      if (existingSlugs.has(skillSlug)) {
        let counter = 1;
        while (existingSlugs.has(`${baseSlug}-${counter}`)) {
          counter++;
        }
        skillSlug = `${baseSlug}-${counter}`;
      }
      this.logger.info('Resolved unique slug', { slug: skillSlug });

      // Create skill with initial version 1
      const initialVersion = 1;

      this.logger.info('Creating skill entity');
      const skill = await this.skillService.addSkill({
        name,
        description,
        slug: skillSlug,
        version: initialVersion,
        prompt,
        userId,
        spaceId,
        allowedTools,
        license,
        compatibility,
        metadata,
      });
      this.logger.info('Skill entity created successfully', {
        skillId: skill.id,
        name,
      });

      // Create initial skill version
      this.logger.info('Creating initial skill version');
      const skillVersion = await this.skillVersionService.addSkillVersion({
        skillId: skill.id,
        name,
        slug: skillSlug,
        description,
        version: initialVersion,
        prompt,
        userId,
        allowedTools,
        license,
        compatibility,
        metadata,
      });
      this.logger.info('Initial skill version created successfully', {
        skillId: skill.id,
        skillVersionId: skillVersion.id,
        version: initialVersion,
      });

      // Save all files
      this.logger.info('Saving skill files', { count: files.length });
      const skillFiles: SkillFile[] = files.map((file) => ({
        id: createSkillFileId(uuidv4()),
        skillVersionId: createSkillVersionId(skillVersion.id),
        path: file.path,
        content: file.content,
        permissions: file.permissions,
      }));

      await this.skillFileRepository.addMany(skillFiles);
      this.logger.info('Skill files saved successfully', {
        count: skillFiles.length,
      });

      this.logger.info('UploadSkill process completed successfully', {
        skillId: skill.id,
        name,
        fileCount: files.length,
      });

      this.eventEmitterService.emit(
        new SkillCreatedEvent({
          skillId: createSkillId(skill.id),
          spaceId,
          organizationId,
          userId,
          source: 'ui',
        }),
      );

      return skill;
    } catch (error) {
      if (
        error instanceof SkillParseError ||
        error instanceof SkillValidationError
      ) {
        this.logger.error('Skill upload failed due to validation', {
          error: error.message,
        });
        throw error;
      }

      this.logger.error('Failed to upload skill', {
        organizationId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
