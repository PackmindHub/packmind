import { PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  MemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  UploadSkillCommand,
  UploadSkillResponse,
  UploadSkillFileInput,
  SkillCreatedEvent,
  SkillUpdatedEvent,
  createSkillId,
  createSkillVersionId,
  createSkillFileId,
  SkillFile,
  SkillVersion,
  createSpaceId,
  IAccountsPort,
  ISpacesPort,
} from '@packmind/types';
import slug from 'slug';
import { v4 as uuidv4 } from 'uuid';
import { IUploadSkill } from '../../../domain/useCases/IUploadSkill';
import { SKILL_MD_FILENAME } from '../../../domain/SkillProperties';
import { SkillService } from '../../services/SkillService';
import { SkillVersionService } from '../../services/SkillVersionService';
import { SkillParser } from '../../parser/SkillParser';
import { SkillValidator } from '../../validator/SkillValidator';
import { ISkillFileRepository } from '../../../domain/repositories/ISkillFileRepository';
import { SkillParseError } from '../../errors/SkillParseError';
import { SkillValidationError } from '../../errors/SkillValidationError';

const origin = 'UploadSkillUsecase';

export class UploadSkillUsecase
  extends AbstractMemberUseCase<UploadSkillCommand, UploadSkillResponse>
  implements IUploadSkill
{
  private readonly skillParser: SkillParser;
  private readonly skillValidator: SkillValidator;

  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly skillService: SkillService,
    private readonly skillVersionService: SkillVersionService,
    private readonly skillFileRepository: ISkillFileRepository,
    private readonly eventEmitterService: PackmindEventEmitterService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
    this.skillParser = new SkillParser();
    this.skillValidator = new SkillValidator();
    this.logger.info('UploadSkillUsecase initialized');
  }

  async executeForMembers(
    command: UploadSkillCommand & MemberContext,
  ): Promise<UploadSkillResponse> {
    const {
      files,
      organizationId: orgIdString,
      spaceId: spaceIdString,
    } = command;
    const spaceId = createSpaceId(spaceIdString);

    this.logger.info('Starting uploadSkill process', {
      fileCount: files.length,
      organizationId: orgIdString,
      userId: command.userId,
      spaceId: spaceIdString,
    });

    try {
      // Verify the space belongs to the organization
      const space = await this.spacesPort.getSpaceById(spaceId);
      if (!space) {
        this.logger.warn('Space not found', { spaceId: spaceIdString });
        throw new Error(`Space with id ${spaceIdString} not found`);
      }

      if (space.organizationId !== orgIdString) {
        this.logger.warn('Space does not belong to organization', {
          spaceId: spaceIdString,
          spaceOrganizationId: space.organizationId,
          requestOrganizationId: orgIdString,
        });
        throw new Error(
          `Space ${spaceIdString} does not belong to organization ${orgIdString}`,
        );
      }
      // Find SKILL.md file
      this.logger.info('Looking for SKILL.md file');
      const skillMdFile = files.find((f) => f.path === SKILL_MD_FILENAME);
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
      const skillSlug = slug(name);
      this.logger.info('Base slug generated', { slug: skillSlug });

      // Check if skill with same slug already exists in space
      this.logger.info('Checking if skill exists in space', {
        slug: skillSlug,
        spaceId,
      });
      const existingSkills = await this.skillService.listSkillsBySpace(spaceId);
      const existingSkill = existingSkills.find((s) => s.slug === skillSlug);

      // Save supporting files (excluding SKILL.md which is already extracted into SkillVersion)
      const supportingFiles = files.filter((f) => f.path !== SKILL_MD_FILENAME);

      if (existingSkill) {
        // Skill exists - check if content is identical to latest version
        this.logger.info('Skill already exists, checking for content changes', {
          skillId: existingSkill.id,
          currentVersion: existingSkill.version,
        });

        const latestVersion =
          await this.skillVersionService.getLatestSkillVersion(
            existingSkill.id,
          );

        if (latestVersion) {
          const isIdentical = await this.isContentIdentical(
            latestVersion,
            {
              name,
              description,
              prompt,
              license,
              compatibility,
              metadata,
              allowedTools,
            },
            files,
          );

          if (isIdentical) {
            this.logger.info(
              'Content is identical to latest version, skipping version creation',
              {
                skillId: existingSkill.id,
                version: existingSkill.version,
              },
            );
            return { skill: existingSkill, versionCreated: false };
          }
        }

        this.logger.info(
          'Content differs from latest version, creating new version',
          {
            skillId: existingSkill.id,
            currentVersion: existingSkill.version,
          },
        );

        const newVersion = existingSkill.version + 1;

        // Update skill entity with new version
        const updatedSkill = await this.skillService.updateSkill(
          existingSkill.id,
          {
            name,
            description,
            slug: skillSlug,
            version: newVersion,
            prompt,
            userId: command.user.id,
            allowedTools,
            license,
            compatibility,
            metadata,
          },
        );
        this.logger.info('Skill entity updated successfully', {
          skillId: updatedSkill.id,
          version: newVersion,
        });

        // Create new skill version
        const skillVersion = await this.skillVersionService.addSkillVersion({
          skillId: existingSkill.id,
          name,
          slug: skillSlug,
          description,
          version: newVersion,
          prompt,
          userId: command.user.id,
          allowedTools,
          license,
          compatibility,
          metadata,
        });
        this.logger.info('New skill version created successfully', {
          skillId: existingSkill.id,
          skillVersionId: skillVersion.id,
          version: newVersion,
        });

        // Save supporting files
        this.logger.info('Saving supporting skill files', {
          count: supportingFiles.length,
        });
        const skillFiles: SkillFile[] = supportingFiles.map((file) => ({
          id: createSkillFileId(uuidv4()),
          skillVersionId: createSkillVersionId(skillVersion.id),
          path: file.path,
          content: file.content,
          permissions: file.permissions,
          isBase64: file.isBase64,
        }));

        await this.skillFileRepository.addMany(skillFiles);
        this.logger.info('Supporting skill files saved successfully', {
          count: skillFiles.length,
        });

        this.logger.info(
          'UploadSkill process completed - new version created',
          {
            skillId: updatedSkill.id,
            version: newVersion,
            supportingFileCount: supportingFiles.length,
          },
        );

        this.eventEmitterService.emit(
          new SkillUpdatedEvent({
            skillId: createSkillId(updatedSkill.id),
            spaceId,
            organizationId: command.organization.id,
            userId: command.user.id,
            source: 'cli',
            fileCount: supportingFiles.length,
          }),
        );

        return { skill: updatedSkill, versionCreated: true };
      }

      // Skill does not exist - create new skill with initial version 1
      this.logger.info('Slug is unique within space, creating new skill', {
        slug: skillSlug,
      });
      const initialVersion = 1;

      this.logger.info('Creating skill entity');
      const skill = await this.skillService.addSkill({
        name,
        description,
        slug: skillSlug,
        version: initialVersion,
        prompt,
        userId: command.user.id,
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
        userId: command.user.id,
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

      // Save supporting files
      this.logger.info('Saving supporting skill files', {
        count: supportingFiles.length,
      });
      const skillFiles: SkillFile[] = supportingFiles.map((file) => ({
        id: createSkillFileId(uuidv4()),
        skillVersionId: createSkillVersionId(skillVersion.id),
        path: file.path,
        content: file.content,
        permissions: file.permissions,
        isBase64: file.isBase64,
      }));

      await this.skillFileRepository.addMany(skillFiles);
      this.logger.info('Supporting skill files saved successfully', {
        count: skillFiles.length,
      });

      this.logger.info('UploadSkill process completed successfully', {
        skillId: skill.id,
        name,
        supportingFileCount: supportingFiles.length,
      });

      this.eventEmitterService.emit(
        new SkillCreatedEvent({
          skillId: createSkillId(skill.id),
          spaceId,
          organizationId: command.organization.id,
          userId: command.user.id,
          source: 'cli',
          fileCount: supportingFiles.length,
        }),
      );

      return { skill, versionCreated: true };
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
        organizationId: command.organization.id,
        userId: command.user.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async isContentIdentical(
    latestVersion: SkillVersion,
    newContent: {
      name: string;
      description: string;
      prompt: string;
      license?: string;
      compatibility?: string;
      metadata?: Record<string, string>;
      allowedTools?: string;
    },
    newFiles: UploadSkillFileInput[],
  ): Promise<boolean> {
    // Compare all content fields
    if (latestVersion.name !== newContent.name) return false;
    if (latestVersion.description !== newContent.description) return false;
    if (latestVersion.prompt !== newContent.prompt) return false;
    if (!comparePotentiallyNull(latestVersion.license, newContent.license))
      return false;
    if (
      !comparePotentiallyNull(
        latestVersion.compatibility,
        newContent.compatibility,
      )
    )
      return false;
    if (
      !comparePotentiallyNull(
        latestVersion.allowedTools,
        newContent.allowedTools,
      )
    )
      return false;

    // Compare metadata (deep equality)
    const latestMetadata = latestVersion.metadata || {};
    const newMetadata = newContent.metadata || {};
    if (
      JSON.stringify(latestMetadata, Object.keys(latestMetadata).sort()) !==
      JSON.stringify(newMetadata, Object.keys(newMetadata).sort())
    ) {
      return false;
    }

    // Compare files
    const latestFiles = await this.skillFileRepository.findBySkillVersionId(
      latestVersion.id,
    );

    // Filter out SKILL.md from new files for comparison
    const newSupportingFiles = newFiles.filter(
      (f) => f.path !== SKILL_MD_FILENAME,
    );

    if (latestFiles.length !== newSupportingFiles.length) return false;

    // Sort both arrays by path for comparison
    const sortedLatestFiles = [...latestFiles].sort((a, b) =>
      a.path.localeCompare(b.path),
    );
    const sortedNewFiles = [...newSupportingFiles].sort((a, b) =>
      a.path.localeCompare(b.path),
    );

    for (let i = 0; i < sortedLatestFiles.length; i++) {
      const latestFile = sortedLatestFiles[i];
      const newFile = sortedNewFiles[i];

      if (latestFile.path !== newFile.path) return false;
      if (latestFile.content !== newFile.content) return false;
      if (latestFile.permissions !== newFile.permissions) return false;
      if (latestFile.isBase64 !== newFile.isBase64) return false;
    }

    return true;
  }
}

// After database extraction, some fields appear as null instead of undefined.
function comparePotentiallyNull(
  str1: string | undefined,
  str2: string | undefined,
) {
  return (str1 ?? '') === (str2 ?? '');
}
