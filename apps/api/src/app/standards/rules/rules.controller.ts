import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import {
  CreateRuleExampleCommand,
  GetRuleExamplesCommand,
  UpdateRuleExampleCommand,
  DeleteRuleExampleCommand,
  RuleExample,
  RuleExampleId,
} from '@packmind/standards';
import { RulesService } from './rules.service';
import { PackmindLogger, stringToProgrammingLanguage } from '@packmind/shared';
import { AuthenticatedRequest } from '@packmind/shared-nest';
import { AuthService } from '../../auth/auth.service';
import { StandardId, Rule, RuleId } from '@packmind/shared';

const origin = 'RulesController';

@Controller('standards/:standardId/rules')
export class RulesController {
  constructor(
    private readonly rulesService: RulesService,
    private readonly authService: AuthService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('RulesController initialized');
  }

  @Get()
  async getRulesByStandardId(
    @Param('standardId') standardId: StandardId,
  ): Promise<Rule[]> {
    this.logger.info(
      'GET /standards/:standardId/rules - Fetching rules for standard',
      {
        standardId,
      },
    );

    try {
      const rules = await this.rulesService.getRulesByStandardId(standardId);
      this.logger.info(
        'GET /standards/:standardId/rules - Rules fetched successfully',
        {
          standardId,
          count: rules.length,
        },
      );
      return rules;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /standards/:standardId/rules - Failed to fetch rules',
        {
          standardId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get(':ruleId/examples')
  async getRuleExamples(
    @Param('standardId') standardId: StandardId,
    @Param('ruleId') ruleId: RuleId,
    @Req() request: AuthenticatedRequest,
  ): Promise<RuleExample[]> {
    this.logger.info(
      'GET /standards/:standardId/rules/:ruleId/examples - Getting rule examples',
      {
        standardId,
        ruleId,
        userId: request.user?.userId,
        organizationId: request.organization?.id,
      },
    );

    try {
      // Extract user and organization context from authenticated request
      const organizationId = request.organization?.id;
      const userId = request.user?.userId;

      if (!organizationId || !userId) {
        this.logger.error(
          'GET /standards/:standardId/rules/:ruleId/examples - Missing user or organization context',
          {
            standardId,
            ruleId,
            userId,
            organizationId,
          },
        );
        throw new BadRequestException('User authentication required');
      }

      const command = this.authService.makePackmindCommand(request, {
        ruleId,
      }) as GetRuleExamplesCommand;

      // Get rule examples using the use case
      const result = await this.rulesService.getRuleExamples(command);

      this.logger.info(
        'GET /standards/:standardId/rules/:ruleId/examples - Rule examples retrieved successfully',
        {
          standardId,
          ruleId,
          count: result.length,
        },
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /standards/:standardId/rules/:ruleId/examples - Failed to get rule examples',
        {
          standardId,
          ruleId,
          error: errorMessage,
        },
      );
      // Return the use case error to the caller rather than a generic 500
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(errorMessage);
    }
  }

  @Post(':ruleId/examples')
  async createRuleExample(
    @Param('standardId') standardId: StandardId,
    @Param('ruleId') ruleId: RuleId,
    @Body()
    body: {
      lang: string;
      positive: string;
      negative: string;
    },
    @Req() request: AuthenticatedRequest,
  ): Promise<RuleExample> {
    this.logger.info(
      'POST /standards/:standardId/rules/:ruleId/examples - Creating rule example',
      {
        standardId,
        ruleId,
        lang: body.lang,
        userId: request.user?.userId,
        organizationId: request.organization?.id,
      },
    );

    try {
      // Extract user and organization context from authenticated request
      const organizationId = request.organization?.id;
      const userId = request.user?.userId;

      if (!organizationId || !userId) {
        this.logger.error(
          'POST /standards/:standardId/rules/:ruleId/examples - Missing user or organization context',
          {
            standardId,
            ruleId,
            userId,
            organizationId,
          },
        );
        throw new BadRequestException('User authentication required');
      }

      // Validate request body
      if (
        !body.lang ||
        typeof body.lang !== 'string' ||
        body.lang.trim().length === 0
      ) {
        this.logger.error(
          'POST /standards/:standardId/rules/:ruleId/examples - Language is required',
        );
        throw new BadRequestException(
          'Language is required and cannot be empty',
        );
      }

      if (typeof body.positive !== 'string') {
        this.logger.error(
          'POST /standards/:standardId/rules/:ruleId/examples - Positive example must be a string',
        );
        throw new BadRequestException('Positive example must be a string');
      }

      if (typeof body.negative !== 'string') {
        this.logger.error(
          'POST /standards/:standardId/rules/:ruleId/examples - Negative example must be a string',
        );
        throw new BadRequestException('Negative example must be a string');
      }

      const command = this.authService.makePackmindCommand(request, {
        ruleId,
        lang: stringToProgrammingLanguage(body.lang),
        positive: body.positive || '',
        negative: body.negative || '',
      }) as CreateRuleExampleCommand;

      // Create rule example using the use case
      const result = await this.rulesService.createRuleExample(command);

      this.logger.info(
        'POST /standards/:standardId/rules/:ruleId/examples - Rule example created successfully',
        {
          standardId,
          ruleId,
          lang: body.lang,
          ruleExampleId: result.id,
        },
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /standards/:standardId/rules/:ruleId/examples - Failed to create rule example',
        {
          standardId,
          ruleId,
          lang: body?.lang,
          error: errorMessage,
        },
      );
      // Return the use case error to the caller rather than a generic 500
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(errorMessage);
    }
  }

  @Put(':ruleId/examples/:exampleId')
  async updateRuleExample(
    @Param('standardId') standardId: StandardId,
    @Param('ruleId') ruleId: RuleId,
    @Param('exampleId') exampleId: RuleExampleId,
    @Body()
    body: {
      lang?: string;
      positive?: string;
      negative?: string;
    },
    @Req() request: AuthenticatedRequest,
  ): Promise<RuleExample> {
    this.logger.info(
      'PUT /standards/:standardId/rules/:ruleId/examples/:exampleId - Updating rule example',
      {
        standardId,
        ruleId,
        exampleId,
        userId: request.user?.userId,
        organizationId: request.organization?.id,
      },
    );

    try {
      // Extract user and organization context from authenticated request
      const organizationId = request.organization?.id;
      const userId = request.user?.userId;

      if (!organizationId || !userId) {
        this.logger.error(
          'PUT /standards/:standardId/rules/:ruleId/examples/:exampleId - Missing user or organization context',
          {
            standardId,
            ruleId,
            exampleId,
            userId,
            organizationId,
          },
        );
        throw new BadRequestException(
          'Authentication required: missing user or organization context',
        );
      }

      const command = this.authService.makePackmindCommand(request, {
        ruleExampleId: exampleId,
        lang: body.lang ? stringToProgrammingLanguage(body.lang) : undefined,
        positive: body.positive,
        negative: body.negative,
      }) as UpdateRuleExampleCommand;

      // Update rule example using the use case
      const result = await this.rulesService.updateRuleExample(command);

      this.logger.info(
        'PUT /standards/:standardId/rules/:ruleId/examples/:exampleId - Rule example updated successfully',
        {
          standardId,
          ruleId,
          exampleId,
          updatedFields: Object.keys(body),
        },
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'PUT /standards/:standardId/rules/:ruleId/examples/:exampleId - Failed to update rule example',
        {
          standardId,
          ruleId,
          exampleId,
          error: errorMessage,
        },
      );
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(errorMessage);
    }
  }

  @Delete(':ruleId/examples/:exampleId')
  async deleteRuleExample(
    @Param('standardId') standardId: StandardId,
    @Param('ruleId') ruleId: RuleId,
    @Param('exampleId') exampleId: RuleExampleId,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    this.logger.info(
      'DELETE /standards/:standardId/rules/:ruleId/examples/:exampleId - Deleting rule example',
      {
        standardId,
        ruleId,
        exampleId,
        userId: request.user?.userId,
        organizationId: request.organization?.id,
      },
    );

    try {
      // Extract user and organization context from authenticated request
      const organizationId = request.organization?.id;
      const userId = request.user?.userId;

      if (!organizationId || !userId) {
        this.logger.error(
          'DELETE /standards/:standardId/rules/:ruleId/examples/:exampleId - Missing user or organization context',
          {
            standardId,
            ruleId,
            exampleId,
            userId,
            organizationId,
          },
        );
        throw new BadRequestException(
          'Authentication required: missing user or organization context',
        );
      }

      const command = this.authService.makePackmindCommand(request, {
        ruleExampleId: exampleId,
      }) as DeleteRuleExampleCommand;

      // Delete rule example using the use case
      await this.rulesService.deleteRuleExample(command);

      this.logger.info(
        'DELETE /standards/:standardId/rules/:ruleId/examples/:exampleId - Rule example deleted successfully',
        {
          standardId,
          ruleId,
          exampleId,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'DELETE /standards/:standardId/rules/:ruleId/examples/:exampleId - Failed to delete rule example',
        {
          standardId,
          ruleId,
          exampleId,
          error: errorMessage,
        },
      );
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(errorMessage);
    }
  }
}
