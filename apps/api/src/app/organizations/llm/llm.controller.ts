import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
  GetLLMConfigurationResponse,
  GetModelsCommand,
  GetModelsResponse,
  OrganizationId,
  PackmindCommandBody,
  SaveLLMConfigurationCommand,
  SaveLLMConfigurationResponse,
  TestLLMConnectionCommand,
  TestLLMConnectionResponse,
  TestSavedLLMConfigurationResponse,
} from '@packmind/types';
import { OrganizationAccessGuard } from '../guards/organization-access.guard';
import { LlmService } from './llm.service';

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

  @Post('configuration')
  async saveConfiguration(
    @Param('orgId') organizationId: OrganizationId,
    @Request() req: AuthenticatedRequest,
    @Body() body: PackmindCommandBody<SaveLLMConfigurationCommand>,
  ): Promise<SaveLLMConfigurationResponse> {
    this.logger.info(
      'POST /organizations/:orgId/llm/configuration - Saving LLM configuration',
      {
        organizationId,
        provider: body.config.provider,
      },
    );

    try {
      const result = await this.llmService.saveConfiguration(req, body);

      this.logger.info(
        'POST /organizations/:orgId/llm/configuration - Configuration saved',
        {
          organizationId,
          provider: body.config.provider,
          success: result.success,
        },
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/llm/configuration - Failed to save configuration',
        {
          organizationId,
          provider: body.config.provider,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('configuration')
  async getConfiguration(
    @Param('orgId') organizationId: OrganizationId,
    @Request() req: AuthenticatedRequest,
  ): Promise<GetLLMConfigurationResponse> {
    this.logger.info(
      'GET /organizations/:orgId/llm/configuration - Getting LLM configuration',
      {
        organizationId,
      },
    );

    try {
      const result = await this.llmService.getConfiguration(req);

      this.logger.info(
        'GET /organizations/:orgId/llm/configuration - Configuration retrieved',
        {
          organizationId,
          hasConfiguration: result.hasConfiguration,
        },
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/llm/configuration - Failed to get configuration',
        {
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Post('configuration/test')
  async testSavedConfiguration(
    @Param('orgId') organizationId: OrganizationId,
    @Request() req: AuthenticatedRequest,
  ): Promise<TestSavedLLMConfigurationResponse> {
    this.logger.info(
      'POST /organizations/:orgId/llm/configuration/test - Testing saved LLM configuration',
      {
        organizationId,
      },
    );

    try {
      const result = await this.llmService.testSavedConfiguration(req);

      this.logger.info(
        'POST /organizations/:orgId/llm/configuration/test - Saved configuration test completed',
        {
          organizationId,
          hasConfiguration: result.hasConfiguration,
          overallSuccess: result.overallSuccess,
        },
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/llm/configuration/test - Failed to test saved configuration',
        {
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
