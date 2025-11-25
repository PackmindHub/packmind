import {
  Body,
  Controller,
  Post,
  Request,
  UseGuards,
  Param,
} from '@nestjs/common';
import { LlmService } from './llm.service';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  TestLLMConnectionResponse,
  GetModelsResponse,
  OrganizationId,
  TestLLMConnectionCommand,
  GetModelsCommand,
  PackmindCommandBody,
} from '@packmind/types';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { OrganizationAccessGuard } from '../guards/organization-access.guard';

const origin = 'OrganizationLlmController';

@Controller()
@UseGuards(OrganizationAccessGuard)
export class LlmController {
  constructor(
    private readonly llmService: LlmService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('OrganizationLlmController initialized');
  }

  @Post('test-connection')
  async testConnection(
    @Param('orgId') organizationId: OrganizationId,
    @Request() req: AuthenticatedRequest,
    @Body() body: PackmindCommandBody<TestLLMConnectionCommand>,
  ): Promise<TestLLMConnectionResponse> {
    this.logger.info(
      'POST /organizations/:orgId/llm/test-connection - Testing LLM connection',
      {
        organizationId,
        provider: body.config.provider,
      },
    );

    try {
      const result = await this.llmService.testConnection(req, body);

      this.logger.info(
        'POST /organizations/:orgId/llm/test-connection - Connection test completed',
        {
          organizationId,
          provider: body.config.provider,
          overallSuccess: result.overallSuccess,
        },
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/llm/test-connection - Failed to test connection',
        {
          organizationId,
          provider: body.config.provider,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Post('get-models')
  async getModels(
    @Param('orgId') organizationId: OrganizationId,
    @Request() req: AuthenticatedRequest,
    @Body() body: PackmindCommandBody<GetModelsCommand>,
  ): Promise<GetModelsResponse> {
    this.logger.info(
      'POST /organizations/:orgId/llm/get-models - Getting available models',
      {
        organizationId,
        provider: body.config.provider,
      },
    );

    try {
      const result = await this.llmService.getModels(req, body);

      this.logger.info(
        'POST /organizations/:orgId/llm/get-models - Successfully retrieved models',
        {
          organizationId,
          provider: body.config.provider,
          modelCount: result.models.length,
          success: result.success,
        },
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/llm/get-models - Failed to get models',
        {
          organizationId,
          provider: body.config.provider,
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
