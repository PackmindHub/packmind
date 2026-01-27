import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import { PublicSkillsService } from './skills.service';

const origin = 'PublicSkillsController';

@Controller()
export class PublicSkillsController {
  constructor(
    private readonly skillsService: PublicSkillsService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('PublicSkillsController initialized');
  }

  @Public()
  @Get('claude')
  async downloadClaudeDefaultSkills(@Res() response: Response): Promise<void> {
    this.logger.info('GET /skills/claude - Downloading Claude default skills');

    const result =
      await this.skillsService.downloadDefaultSkillsZipForAgent('claude');

    this.logger.info(
      'GET /skills/claude - Claude default skills zip created successfully',
      { fileName: result.fileName },
    );

    response
      .setHeader('Content-Type', 'application/zip')
      .setHeader(
        'Content-Disposition',
        `attachment; filename="${result.fileName}"`,
      )
      .send(Buffer.from(result.fileContent, 'base64'));
  }

  @Public()
  @Get('copilot')
  async downloadCopilotDefaultSkills(@Res() response: Response): Promise<void> {
    this.logger.info(
      'GET /skills/copilot - Downloading Copilot default skills',
    );

    const result =
      await this.skillsService.downloadDefaultSkillsZipForAgent('copilot');

    this.logger.info(
      'GET /skills/copilot - Copilot default skills zip created successfully',
      { fileName: result.fileName },
    );

    response
      .setHeader('Content-Type', 'application/zip')
      .setHeader(
        'Content-Disposition',
        `attachment; filename="${result.fileName}"`,
      )
      .send(Buffer.from(result.fileContent, 'base64'));
  }

  @Public()
  @Get('cursor')
  async downloadCursorDefaultSkills(@Res() response: Response): Promise<void> {
    this.logger.info('GET /skills/cursor - Downloading Cursor default skills');

    const result =
      await this.skillsService.downloadDefaultSkillsZipForAgent('cursor');

    this.logger.info(
      'GET /skills/cursor - Cursor default skills zip created successfully',
      { fileName: result.fileName },
    );

    response
      .setHeader('Content-Type', 'application/zip')
      .setHeader(
        'Content-Disposition',
        `attachment; filename="${result.fileName}"`,
      )
      .send(Buffer.from(result.fileContent, 'base64'));
  }
}
