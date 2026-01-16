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
  UseGuards,
} from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { GetRuleExamplesCommand } from '@packmind/standards';
import {
  CreateRuleExampleCommand,
  DeleteRuleExampleCommand,
  OrganizationId,
  Rule,
  RuleExample,
  RuleExampleId,
  RuleId,
  SpaceId,
  StandardId,
  UpdateRuleExampleCommand,
  stringToProgrammingLanguage,
} from '@packmind/types';
import { RulesService } from './rules.service';
import { OrganizationAccessGuard } from '../../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../../guards/space-access.guard';

const origin = 'OrganizationsSpacesStandardsRulesController';

/**
 * Controller for rules routes within space-scoped standards in organizations
 * Actual path: /organizations/:orgId/spaces/:spaceId/standards/:standardId/rules (inherited via RouterModule in AppModule)
 *
 * This controller provides rules endpoints for standards within organizations.
 * The path is inherited from the RouterModule configuration in AppModule:
 * - Parent: /organizations/:orgId/spaces/:spaceId/standards/:standardId
 * - This controller: (empty, inherits from /rules path in RouterModule)
 * - Final path: /organizations/:orgId/spaces/:spaceId/standards/:standardId/rules
 *
 * Both OrganizationAccessGuard and SpaceAccessGuard ensure proper access control.
 * Additional validation ensures the standard belongs to the specified space.
 */
@Controller()
@UseGuards(OrganizationAccessGuard, SpaceAccessGuard)
export class OrganizationsSpacesStandardsRulesController {
  constructor(
    private readonly rulesService: RulesService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('OrganizationsSpacesStandardsRulesController initialized');
  }

  /**
   * Get all rules for a standard within a space
   * GET /organizations/:orgId/spaces/:spaceId/standards/:standardId/rules
   */
  @Get()
  async getRulesByStandardId(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('standardId') standardId: StandardId,
    @Req() request: AuthenticatedRequest,
  ): Promise<Rule[]> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/standards/:standardId/rules - Fetching rules for standard',
      {
        organizationId,
        spaceId,
        standardId,
        userId,
      },
    );

    try {
      // Validate that the standard belongs to the specified space
      const standardResponse = await this.rulesService.getStandardById(
        standardId,
        organizationId,
        spaceId,
        userId,
      );

      if (!standardResponse || !standardResponse.standard) {
        this.logger.error(
          'GET /organizations/:orgId/spaces/:spaceId/standards/:standardId/rules - Standard not found',
          {
            organizationId,
            spaceId,
            standardId,
            userId,
          },
        );
        throw new NotFoundException(
          `Standard ${standardId} not found in space ${spaceId}`,
        );
      }

      const standard = standardResponse.standard;

      // Verify standard belongs to the specified space
      if (standard.spaceId !== spaceId) {
        this.logger.error(
          'GET /organizations/:orgId/spaces/:spaceId/standards/:standardId/rules - Standard does not belong to space',
          {
            organizationId,
            spaceId,
            standardId,
            standardSpaceId: standard.spaceId,
            userId,
          },
        );
        throw new NotFoundException(
          `Standard ${standardId} does not belong to space ${spaceId}`,
        );
      }

      // Fetch rules for the standard
      const rules = await this.rulesService.getRulesByStandardId(standardId);

      this.logger.info(
        'GET /organizations/:orgId/spaces/:spaceId/standards/:standardId/rules - Rules fetched successfully',
        {
          organizationId,
          spaceId,
          standardId,
          userId,
          count: rules.length,
        },
      );

      return rules;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Don't log again if it's already a NotFoundException we threw
      if (!(error instanceof NotFoundException)) {
        this.logger.error(
          'GET /organizations/:orgId/spaces/:spaceId/standards/:standardId/rules - Failed to fetch rules',
          {
            organizationId,
            spaceId,
            standardId,
            userId,
            error: errorMessage,
          },
        );
      }

      throw error;
    }
  }

  /**
   * Get examples for a specific rule within a standard
   * GET /organizations/:orgId/spaces/:spaceId/standards/:standardId/rules/:ruleId/examples
   */
  @Get(':ruleId/examples')
  async getRuleExamples(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('standardId') standardId: StandardId,
    @Param('ruleId') ruleId: RuleId,
    @Req() request: AuthenticatedRequest,
  ): Promise<RuleExample[]> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/standards/:standardId/rules/:ruleId/examples - Getting rule examples',
      {
        organizationId,
        spaceId,
        standardId,
        ruleId,
        userId,
      },
    );

    try {
      // Validate that the standard belongs to the specified space
      const standardResponse = await this.rulesService.getStandardById(
        standardId,
        organizationId,
        spaceId,
        userId,
      );

      if (!standardResponse || !standardResponse.standard) {
        this.logger.warn(
          'Standard not found or does not belong to the specified organization/space',
          { organizationId, spaceId, standardId, ruleId, userId },
        );
        throw new NotFoundException(
          `Standard with ID ${standardId} not found in organization ${organizationId} and space ${spaceId}`,
        );
      }

      const standard = standardResponse.standard;

      // Verify standard belongs to the specified space
      if (standard.spaceId !== spaceId) {
        this.logger.warn('Standard does not belong to the specified space', {
          organizationId,
          spaceId,
          standardId,
          ruleId,
          standardSpaceId: standard.spaceId,
          userId,
        });
        throw new NotFoundException(
          `Standard ${standardId} does not belong to space ${spaceId}`,
        );
      }

      // Create command and fetch rule examples
      const command: GetRuleExamplesCommand = {
        userId,
        organizationId,
        ruleId,
        source: request.clientSource,
      };

      const result = await this.rulesService.getRuleExamples(command);

      this.logger.info(
        'GET /organizations/:orgId/spaces/:spaceId/standards/:standardId/rules/:ruleId/examples - Rule examples fetched successfully',
        {
          organizationId,
          spaceId,
          standardId,
          ruleId,
          count: result.length,
        },
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Don't log again if it's already an exception we threw
      if (
        !(error instanceof NotFoundException) &&
        !(error instanceof BadRequestException)
      ) {
        this.logger.error(
          'GET /organizations/:orgId/spaces/:spaceId/standards/:standardId/rules/:ruleId/examples - Failed to get rule examples',
          {
            organizationId,
            spaceId,
            standardId,
            ruleId,
            userId,
            error: errorMessage,
          },
        );
      }

      throw error;
    }
  }

  /**
   * Create a new example for a specific rule within a standard
   * POST /organizations/:orgId/spaces/:spaceId/standards/:standardId/rules/:ruleId/examples
   */
  @Post(':ruleId/examples')
  async createRuleExample(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
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
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/standards/:standardId/rules/:ruleId/examples - Creating rule example',
      {
        organizationId,
        spaceId,
        standardId,
        ruleId,
        lang: body.lang,
        userId,
      },
    );

    try {
      // Validate request body
      if (
        !body.lang ||
        typeof body.lang !== 'string' ||
        body.lang.trim().length === 0
      ) {
        throw new BadRequestException(
          'Language is required and cannot be empty',
        );
      }

      if (typeof body.positive !== 'string') {
        throw new BadRequestException('Positive example must be a string');
      }

      if (typeof body.negative !== 'string') {
        throw new BadRequestException('Negative example must be a string');
      }

      // Validate that the standard belongs to the specified space
      const standardResponse = await this.rulesService.getStandardById(
        standardId,
        organizationId,
        spaceId,
        userId,
      );

      if (!standardResponse || !standardResponse.standard) {
        throw new NotFoundException(
          `Standard with ID ${standardId} not found in organization ${organizationId} and space ${spaceId}`,
        );
      }

      if (standardResponse.standard.spaceId !== spaceId) {
        throw new NotFoundException(
          `Standard ${standardId} does not belong to space ${spaceId}`,
        );
      }

      // Create command and call service
      const command: CreateRuleExampleCommand = {
        userId,
        organizationId,
        ruleId,
        lang: stringToProgrammingLanguage(body.lang),
        positive: body.positive || '',
        negative: body.negative || '',
        source: request.clientSource,
      };

      const result = await this.rulesService.createRuleExample(command);

      this.logger.info(
        'POST /organizations/:orgId/spaces/:spaceId/standards/:standardId/rules/:ruleId/examples - Rule example created successfully',
        {
          organizationId,
          spaceId,
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

      if (
        !(error instanceof NotFoundException) &&
        !(error instanceof BadRequestException)
      ) {
        this.logger.error(
          'POST /organizations/:orgId/spaces/:spaceId/standards/:standardId/rules/:ruleId/examples - Failed to create rule example',
          {
            organizationId,
            spaceId,
            standardId,
            ruleId,
            lang: body?.lang,
            userId,
            error: errorMessage,
          },
        );
      }

      throw error;
    }
  }

  /**
   * Update an existing example for a specific rule within a standard
   * PUT /organizations/:orgId/spaces/:spaceId/standards/:standardId/rules/:ruleId/examples/:exampleId
   */
  @Put(':ruleId/examples/:exampleId')
  async updateRuleExample(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
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
    const userId = request.user.userId;

    this.logger.info(
      'PUT /organizations/:orgId/spaces/:spaceId/standards/:standardId/rules/:ruleId/examples/:exampleId - Updating rule example',
      {
        organizationId,
        spaceId,
        standardId,
        ruleId,
        exampleId,
        userId,
      },
    );

    try {
      // Validate that the standard belongs to the specified space
      const standardResponse = await this.rulesService.getStandardById(
        standardId,
        organizationId,
        spaceId,
        userId,
      );

      if (!standardResponse || !standardResponse.standard) {
        throw new NotFoundException(
          `Standard with ID ${standardId} not found in organization ${organizationId} and space ${spaceId}`,
        );
      }

      if (standardResponse.standard.spaceId !== spaceId) {
        throw new NotFoundException(
          `Standard ${standardId} does not belong to space ${spaceId}`,
        );
      }

      // Create command and call service
      const command: UpdateRuleExampleCommand = {
        userId,
        organizationId,
        ruleExampleId: exampleId,
        lang: body.lang ? stringToProgrammingLanguage(body.lang) : undefined,
        positive: body.positive,
        negative: body.negative,
        source: request.clientSource,
      };

      const result = await this.rulesService.updateRuleExample(command);

      this.logger.info(
        'PUT /organizations/:orgId/spaces/:spaceId/standards/:standardId/rules/:ruleId/examples/:exampleId - Rule example updated successfully',
        {
          organizationId,
          spaceId,
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

      if (
        !(error instanceof NotFoundException) &&
        !(error instanceof BadRequestException)
      ) {
        this.logger.error(
          'PUT /organizations/:orgId/spaces/:spaceId/standards/:standardId/rules/:ruleId/examples/:exampleId - Failed to update rule example',
          {
            organizationId,
            spaceId,
            standardId,
            ruleId,
            exampleId,
            userId,
            error: errorMessage,
          },
        );
      }

      throw error;
    }
  }

  /**
   * Delete an example for a specific rule within a standard
   * DELETE /organizations/:orgId/spaces/:spaceId/standards/:standardId/rules/:ruleId/examples/:exampleId
   */
  @Delete(':ruleId/examples/:exampleId')
  async deleteRuleExample(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('standardId') standardId: StandardId,
    @Param('ruleId') ruleId: RuleId,
    @Param('exampleId') exampleId: RuleExampleId,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const userId = request.user.userId;

    this.logger.info(
      'DELETE /organizations/:orgId/spaces/:spaceId/standards/:standardId/rules/:ruleId/examples/:exampleId - Deleting rule example',
      {
        organizationId,
        spaceId,
        standardId,
        ruleId,
        exampleId,
        userId,
      },
    );

    try {
      // Validate that the standard belongs to the specified space
      const standardResponse = await this.rulesService.getStandardById(
        standardId,
        organizationId,
        spaceId,
        userId,
      );

      if (!standardResponse || !standardResponse.standard) {
        throw new NotFoundException(
          `Standard with ID ${standardId} not found in organization ${organizationId} and space ${spaceId}`,
        );
      }

      if (standardResponse.standard.spaceId !== spaceId) {
        throw new NotFoundException(
          `Standard ${standardId} does not belong to space ${spaceId}`,
        );
      }

      // Create command and call service
      const command: DeleteRuleExampleCommand = {
        userId,
        organizationId,
        ruleExampleId: exampleId,
        source: request.clientSource,
      };

      await this.rulesService.deleteRuleExample(command);

      this.logger.info(
        'DELETE /organizations/:orgId/spaces/:spaceId/standards/:standardId/rules/:ruleId/examples/:exampleId - Rule example deleted successfully',
        {
          organizationId,
          spaceId,
          standardId,
          ruleId,
          exampleId,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        !(error instanceof NotFoundException) &&
        !(error instanceof BadRequestException)
      ) {
        this.logger.error(
          'DELETE /organizations/:orgId/spaces/:spaceId/standards/:standardId/rules/:ruleId/examples/:exampleId - Failed to delete rule example',
          {
            organizationId,
            spaceId,
            standardId,
            ruleId,
            exampleId,
            userId,
            error: errorMessage,
          },
        );
      }

      throw error;
    }
  }
}
