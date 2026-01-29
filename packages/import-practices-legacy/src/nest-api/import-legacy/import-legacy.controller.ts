import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { IpFilterGuard } from '../guards/ip-filter.guard';
import { ImportLegacyService } from './import-legacy.service';
import {
  ImportPracticeLegacyCommand,
  ImportPracticeLegacyResponse,
  LegacyPracticeInput,
} from '../../types';

const origin = 'ImportLegacyController';

@Controller('')
export class ImportLegacyController {
  private readonly logger: PackmindLogger;

  constructor(private readonly importLegacyService: ImportLegacyService) {
    this.logger = new PackmindLogger(origin);
    this.logger.info('ImportLegacyController initialized');
  }

  @Post('import-legacy')
  @UseGuards(IpFilterGuard)
  async importLegacy(
    @Body() body: LegacyPracticeInput,
    @Req() request: AuthenticatedRequest,
  ): Promise<ImportPracticeLegacyResponse> {
    this.logger.info('POST /import-legacy - Importing legacy practices', {
      standardsCount: body?.standards?.length,
      organizationId: request.organization?.id,
      userId: request.user?.userId,
    });

    try {
      const organizationId = request.organization?.id;
      const userId = request.user?.userId;

      if (!organizationId || !userId) {
        this.logger.error(
          'POST /import-legacy - Missing user or organization context',
          {
            organizationId,
            userId,
          },
        );
        throw new BadRequestException('User authentication required');
      }

      // Validate body
      if (!body || !body.standards || !Array.isArray(body.standards)) {
        this.logger.error(
          'POST /import-legacy - Invalid body: standards array required',
        );
        throw new BadRequestException(
          'Invalid body: standards array is required',
        );
      }

      if (body.standards.length === 0) {
        this.logger.error(
          'POST /import-legacy - Invalid body: standards array is empty',
        );
        throw new BadRequestException(
          'Invalid body: standards array cannot be empty',
        );
      }

      const command: ImportPracticeLegacyCommand = {
        organizationId,
        userId,
        legacyData: body,
      };

      const result = await this.importLegacyService.importLegacy(command);

      this.logger.info('POST /import-legacy - Import completed successfully', {
        importedCount: result.importedStandards.length,
        skippedCount: result.skippedStandards.length,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('POST /import-legacy - Import failed', {
        error: errorMessage,
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(errorMessage);
    }
  }
}
