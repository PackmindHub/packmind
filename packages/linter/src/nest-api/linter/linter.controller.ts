import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import {
  stringToProgrammingLanguage,
  ProgrammingLanguage,
} from '@packmind/types';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
  RuleId,
  StandardId,
  DetectionProgram,
  DetectionProgramId,
  DetectionModeEnum,
  CreateNewDetectionProgramVersionCommand,
  ActiveDetectionProgram,
  ActiveDetectionProgramId,
  LanguageDetectionPrograms,
  GetActiveDetectionProgramCommand,
  CreateDetectionProgramCommand,
  StartProgramGenerationCommand,
  ListDetectionProgramCommand,
  ListDetectionProgramResponse,
  GetAllDetectionProgramsByRuleCommand,
  GetDetectionProgramMetadataCommand,
  DetectionProgramMetadata,
  UpdateActiveDetectionProgramCommand,
  GetRuleDetectionAssessmentCommand,
  RuleDetectionAssessment,
  GetDraftDetectionProgramForRuleCommand,
  GetActiveDetectionProgramForRuleCommand,
  ComputeRuleLanguageDetectionStatusCommand,
  GetStandardRulesDetectionStatusCommand,
  RuleDetectionStatusSummary,
  TestProgramExecutionCommand,
  LinterExecutionViolation,
  DetectionHeuristicsId,
  UpdateRuleDetectionHeuristicsCommand,
  GetDetectionHeuristicsCommand,
  DetectionHeuristics,
} from '@packmind/types';
import { LinterHexa } from '../../LinterHexa';
import { LinterService } from './linter.service';
import {
  RuleNotFoundForProgramGenerationError,
  RuleNotLinkedToStandardForProgramGenerationError,
  StandardNotFoundForProgramGenerationError,
  UnauthorizedProgramGenerationError,
} from '../../application/useCases/generateProgramUseCase/errors';
import { DetectionProgramNotFoundError } from '../../domain/errors/DetectionProgramNotFoundError';
import { UnauthorizedTestProgramExecutionError } from '../../domain/errors/UnauthorizedTestProgramExecutionError';

const origin = 'LinterController';

@Controller('')
export class LinterController {
  constructor(
    private readonly linterService: LinterService,
    private readonly linterHexa: LinterHexa,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('RulesController initialized');
  }

  @Post('standards/:standardId/rules/:ruleId/detection-program/generate')
  async generateProgram(
    @Param('standardId') standardId: StandardId,
    @Param('ruleId') ruleId: RuleId,
    @Req() request: AuthenticatedRequest,
    @Body() body: { language?: string } = {},
  ): Promise<void> {
    const organizationId = request.organization.id;
    this.logger.info(
      'POST /standards/:standardId/rules/:ruleId/detection-program/generate - Generating program for rule',
      {
        organizationId,
        standardId,
        ruleId,
        language: body?.language,
      },
    );

    try {
      const requestOrganizationId = request.organization?.id;
      const requestUserId = request.user?.userId;

      if (!requestOrganizationId || !requestUserId) {
        this.logger.error(
          'POST /standards/:standardId/rules/:ruleId/detection-program/generate - Missing user or organization context',
          {
            organizationId: requestOrganizationId,
            userId: requestUserId,
            standardId,
            ruleId,
          },
        );
        throw new BadRequestException('User authentication required');
      }

      let requestedLanguage = undefined;
      if (body?.language) {
        try {
          requestedLanguage = stringToProgrammingLanguage(body.language);
        } catch (conversionError) {
          this.logger.error(
            'POST /standards/:standardId/rules/:ruleId/detection-program/generate - Invalid language provided',
            {
              standardId,
              ruleId,
              organizationId,
              language: body.language,
              error:
                conversionError instanceof Error
                  ? conversionError.message
                  : String(conversionError),
            },
          );
          throw new BadRequestException('Invalid programming language');
        }
      }

      // Create command for LinterHexa
      const command: StartProgramGenerationCommand = {
        userId: requestUserId,
        organizationId: requestOrganizationId,
        ruleId,
        language: requestedLanguage,
      };

      // Use LinterHexa to generate the program
      const response = await this.linterHexa
        .getAdapter()
        .startGenerateProgram(command);

      this.logger.info(
        'POST /standards/:standardId/rules/:ruleId/detection-program/generate - Program generation job submitted successfully',
        {
          organizationId,
          standardId,
          ruleId,
          message: response.message,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /standards/:standardId/rules/:ruleId/detection-program/generate - Failed to submit program generation job',
        {
          organizationId,
          standardId,
          ruleId,
          error: errorMessage,
        },
      );

      if (error instanceof StandardNotFoundForProgramGenerationError) {
        throw new NotFoundException(errorMessage);
      }
      if (error instanceof RuleNotFoundForProgramGenerationError) {
        throw new NotFoundException(errorMessage);
      }
      if (error instanceof RuleNotLinkedToStandardForProgramGenerationError) {
        throw new BadRequestException(errorMessage);
      }
      if (error instanceof UnauthorizedProgramGenerationError) {
        throw new ForbiddenException(errorMessage);
      }

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException(errorMessage);
    }
  }

  @Post('standards/:standardId/rules/:ruleId/detection-program')
  async createDetectionProgram(
    @Param('standardId') standardId: StandardId,
    @Param('ruleId') ruleId: RuleId,
    @Body()
    body: {
      code: string;
      language: string;
      mode: DetectionModeEnum;
    },
    @Req() request: AuthenticatedRequest,
  ): Promise<DetectionProgram> {
    this.logger.info(
      'POST /standards/:standardId/rules/:ruleId/detection-program - Creating detection program',
      {
        standardId,
        ruleId,
        language: body.language,
        mode: body.mode,
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
          'POST /standards/:standardId/rules/:ruleId/detection-program - Missing user or organization context',
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
      if (!body.code || typeof body.code !== 'string') {
        this.logger.error(
          'POST /standards/:standardId/rules/:ruleId/detection-program - Detection program code is required',
        );
        throw new BadRequestException('Detection program code is required');
      }

      if (!body.language || typeof body.language !== 'string') {
        this.logger.error(
          'POST /standards/:standardId/rules/:ruleId/detection-program - Language is required',
        );
        throw new BadRequestException('Language is required');
      }

      if (!body.mode || !Object.values(DetectionModeEnum).includes(body.mode)) {
        this.logger.error(
          'POST /standards/:standardId/rules/:ruleId/detection-program - Valid mode is required',
          {
            providedMode: body.mode,
            validModes: Object.values(DetectionModeEnum),
          },
        );
        throw new BadRequestException(
          `Valid mode is required. Supported modes: ${Object.values(DetectionModeEnum).join(', ')}`,
        );
      }

      const command: CreateDetectionProgramCommand = {
        organizationId: request.organization.id,
        userId: request.user.userId,
        ruleId,
        language: stringToProgrammingLanguage(body.language),
        mode: body.mode,
        code: body.code,
      };

      // const command = this.authService.makePackmindCommand(request, {
      //   ruleId,
      //   language: body.language,
      //   mode: body.mode,
      //   code: body.code,
      // }) as CreateDetectionProgramCommand;

      // Create detection program using actual use case
      const result = await this.linterService.createDetectionProgram(command);

      this.logger.info(
        'POST /standards/:standardId/rules/:ruleId/detection-program - Detection program created successfully',
        {
          standardId,
          ruleId,
          language: body.language,
          mode: body.mode,
          detectionProgramId: result.id,
        },
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /standards/:standardId/rules/:ruleId/detection-program - Failed to create detection program',
        {
          standardId,
          ruleId,
          language: body?.language,
          mode: body?.mode,
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

  @Put(
    'standards/:standardId/rules/:ruleId/detection-program/:detectionProgramId',
  )
  async updateDetectionProgram(
    @Param('standardId') standardId: StandardId,
    @Param('ruleId') ruleId: RuleId,
    @Param('detectionProgramId') detectionProgramId: ActiveDetectionProgramId,
    @Body()
    body: {
      code: string;
      mode?: DetectionModeEnum;
    },
    @Req() request: AuthenticatedRequest,
  ): Promise<DetectionProgram> {
    this.logger.info(
      'PUT /standards/:standardId/rules/:ruleId/detection-program/:detectionProgramId - Updating detection program',
      {
        standardId,
        ruleId,
        detectionProgramId,
        mode: body.mode,
        code: body.code,
      },
    );

    try {
      // Validate request body
      if (!body.code || typeof body.code !== 'string') {
        this.logger.error(
          'PUT /standards/:standardId/rules/:ruleId/detection-program/:detectionProgramId - Detection program code is required',
        );
        throw new BadRequestException('Detection program code is required');
      }

      if (body.mode && !Object.values(DetectionModeEnum).includes(body.mode)) {
        this.logger.error(
          'PUT /standards/:standardId/rules/:ruleId/detection-program/:detectionProgramId - Valid mode is required',
          {
            providedMode: body.mode,
            validModes: Object.values(DetectionModeEnum),
          },
        );
        throw new BadRequestException(
          `Valid mode is required. Supported modes: ${Object.values(DetectionModeEnum).join(', ')}`,
        );
      }

      const command: CreateNewDetectionProgramVersionCommand = {
        activeDetectionProgramId: detectionProgramId,
        code: body.code,
        mode: body.mode,
        organizationId: request.organization.id,
        userId: request.user.userId,
      };
      // const command = this.authService.makePackmindCommand(request, {
      //   activeDetectionProgramId: detectionProgramId,
      //   code: body.code,
      //   mode: body.mode,
      // }) as CreateNewDetectionProgramVersionCommand;

      const result =
        await this.linterService.createNewDetectionProgramVersion(command);

      this.logger.info(
        'PUT /standards/:standardId/rules/:ruleId/detection-program/:detectionProgramId - Detection program updated successfully',
        {
          standardId,
          ruleId,
          mode: body.mode,
          code: body.code,
          detectionProgramId: result.id,
        },
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'PUT /standards/:standardId/rules/:ruleId/detection-program/:detectionProgramId - Failed to update detection program',
        {
          standardId,
          ruleId,
          mode: body.mode,
          code: body.code,
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

  @Post(
    'standards/:standardId/rules/:ruleId/detection-program/:activeDetectionProgramId/activate',
  )
  async activateDetectionProgram(
    @Param('standardId') standardId: StandardId,
    @Param('ruleId') ruleId: RuleId,
    @Param('activeDetectionProgramId')
    activeDetectionProgramId: ActiveDetectionProgramId,
    @Body()
    body: {
      detectionProgramId: string;
    },
    @Req() request: AuthenticatedRequest,
  ): Promise<ActiveDetectionProgram> {
    this.logger.info(
      'POST /standards/:standardId/rules/:ruleId/detection-program/:activeDetectionProgramId/activate - Activating detection program',
      {
        standardId,
        ruleId,
        activeDetectionProgramId,
        detectionProgramId: body?.detectionProgramId,
      },
    );

    try {
      const organizationId = request.organization?.id;
      const userId = request.user?.userId;

      if (!organizationId || !userId) {
        this.logger.error(
          'POST /standards/:standardId/rules/:ruleId/detection-program/:activeDetectionProgramId/activate - Missing user or organization context',
          {
            standardId,
            ruleId,
            activeDetectionProgramId,
          },
        );
        throw new BadRequestException('User authentication required');
      }

      const { detectionProgramId } = body;

      if (!detectionProgramId || typeof detectionProgramId !== 'string') {
        this.logger.error(
          'POST /standards/:standardId/rules/:ruleId/detection-program/:activeDetectionProgramId/activate - detectionProgramId is required',
          {
            standardId,
            ruleId,
            activeDetectionProgramId,
          },
        );
        throw new BadRequestException('detectionProgramId is required');
      }

      const activeDetectionProgram =
        await this.linterService.getActiveDetectionProgramById(
          activeDetectionProgramId,
        );

      if (!activeDetectionProgram || activeDetectionProgram.ruleId !== ruleId) {
        this.logger.error(
          'POST /standards/:standardId/rules/:ruleId/detection-program/:activeDetectionProgramId/activate - Active detection program not found',
          {
            standardId,
            ruleId,
            activeDetectionProgramId,
          },
        );
        throw new NotFoundException('Active detection program not found');
      }

      const command: UpdateActiveDetectionProgramCommand = {
        organizationId,
        userId,
        activeDetectionProgram,
        newDetectionProgramVersion: detectionProgramId as DetectionProgramId,
        newDetectionProgramDraftVersion: null,
      };

      const result =
        await this.linterService.updateActiveDetectionProgram(command);

      this.logger.info(
        'POST /standards/:standardId/rules/:ruleId/detection-program/:activeDetectionProgramId/activate - Detection program activated successfully',
        {
          standardId,
          ruleId,
          activeDetectionProgramId,
          detectionProgramId,
        },
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /standards/:standardId/rules/:ruleId/detection-program/:activeDetectionProgramId/activate - Failed to activate detection program',
        {
          standardId,
          ruleId,
          activeDetectionProgramId,
          detectionProgramId: body?.detectionProgramId,
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

  @Get('standards/:standardId/rules/:ruleId/detection-program')
  async getActiveDetectionProgram(
    @Param('standardId') standardId: StandardId,
    @Param('ruleId') ruleId: RuleId,
    @Req() request: AuthenticatedRequest,
    @Query('language') language?: string,
  ): Promise<LanguageDetectionPrograms[] | LanguageDetectionPrograms | null> {
    this.logger.info(
      'GET /standards/:standardId/rules/:ruleId/detection-program - Getting active detection program',
      {
        standardId,
        ruleId,
        language,
        userId: request.user?.userId,
        organizationId: request.organization?.id,
      },
    );

    try {
      const command: GetActiveDetectionProgramCommand = {
        organizationId: request.organization.id,
        userId: request.user.userId,
        ruleId,
        language,
      };
      // const command = this.authService.makePackmindCommand(request, {
      //   ruleId,
      //   language,
      // }) as GetActiveDetectionProgramCommand;

      // Get active detection programs using actual use case
      const response =
        await this.linterService.getActiveDetectionProgram(command);

      // If language is specified, return single object; otherwise return array
      const result =
        language && response.programs && response.programs.length > 0
          ? response.programs[0]
          : response.programs || [];

      this.logger.info(
        'GET /standards/:standardId/rules/:ruleId/detection-program - Active detection program retrieved successfully',
        {
          standardId,
          ruleId,
          language,
          resultType: language ? 'single' : 'array',
          programsCount: Array.isArray(result) ? result.length : result ? 1 : 0,
        },
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /standards/:standardId/rules/:ruleId/detection-program - Failed to get active detection program',
        {
          standardId,
          ruleId,
          language,
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

  @Post('list-detection-program')
  async listDetectionPrograms(
    @Body() body: { gitRemoteUrl: string; branches: string[] },
    @Req() request: AuthenticatedRequest,
  ): Promise<ListDetectionProgramResponse> {
    const { gitRemoteUrl, branches } = body;
    this.logger.info(
      'GET /standards/list-detection-program - Listing detection programs',
      {
        gitRemoteUrl,
        branches,
        userId: request.user?.userId,
        organizationId: request.organization?.id,
      },
    );

    try {
      // Extract user and organization context from authenticated request
      const organizationId = request.organization?.id;
      const userId = request.user?.userId;

      // Validate gitRemoteUrl parameter
      if (!gitRemoteUrl || gitRemoteUrl.trim() === '') {
        this.logger.error(
          'GET /standards/list-detection-program - gitRemoteUrl parameter is required',
          {
            gitRemoteUrl,
            organizationId,
            userId,
          },
        );
        throw new BadRequestException(
          'gitRemoteUrl parameter is required and cannot be empty',
        );
      }

      // Validate branches parameter
      if (!branches || !Array.isArray(branches) || branches.length === 0) {
        this.logger.error(
          'GET /standards/list-detection-program - branches parameter is required',
          {
            branches,
            organizationId,
            userId,
          },
        );
        throw new BadRequestException(
          'branches parameter is required and must be a non-empty array',
        );
      }

      const command: ListDetectionProgramCommand = {
        organizationId: request.organization.id,
        userId: request.user.userId,
        gitRemoteUrl: gitRemoteUrl.trim(),
        branches,
      };
      // const command = this.authService.makePackmindCommand(request, {
      //   gitRemoteUrl: gitRemoteUrl.trim(),
      // }) as ListDetectionProgramCommand;

      // Call the service method to list detection programs
      const result = await this.linterService.listDetectionPrograms(command);

      this.logger.info(
        'GET /standards/list-detection-program - Detection programs listed successfully',
        {
          gitRemoteUrl,
          organizationId,
          userId,
          targetsCount: result.targets.length,
          totalStandards: result.targets.reduce(
            (sum, target) => sum + target.standards.length,
            0,
          ),
        },
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /standards/list-detection-program - Failed to list detection programs',
        {
          gitRemoteUrl,
          organizationId: request.organization?.id,
          userId: request.user?.userId,
          error: errorMessage,
        },
      );

      // Return appropriate HTTP status codes for different error scenarios
      if (error instanceof BadRequestException) {
        throw error;
      }

      // For other errors, wrap in BadRequestException to maintain consistency
      throw new BadRequestException(errorMessage);
    }
  }

  @Get('standards/:standardId/rules/:ruleId/detection-programs/all')
  async getAllDetectionProgramsByRule(
    @Param('standardId') standardId: StandardId,
    @Param('ruleId') ruleId: RuleId,
    @Req() request: AuthenticatedRequest,
  ): Promise<DetectionProgram[]> {
    this.logger.info(
      'GET /standards/:standardId/rules/:ruleId/detection-programs/all - Getting all detection programs',
      {
        standardId,
        ruleId,
        userId: request.user?.userId,
        organizationId: request.organization?.id,
      },
    );

    try {
      const command: GetAllDetectionProgramsByRuleCommand = {
        organizationId: request.organization.id,
        userId: request.user.userId,
        ruleId,
      };

      const response =
        await this.linterService.getAllDetectionProgramsByRule(command);

      this.logger.info(
        'GET /standards/:standardId/rules/:ruleId/detection-programs/all - All detection programs retrieved successfully',
        {
          standardId,
          ruleId,
          programsCount: response.programs.length,
        },
      );

      return response.programs;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /standards/:standardId/rules/:ruleId/detection-programs/all - Failed to get all detection programs',
        {
          standardId,
          ruleId,
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

  @Get('standards/:standardId/rules/:ruleId/detection-assessment')
  async getRuleDetectionAssessment(
    @Param('standardId') standardId: StandardId,
    @Param('ruleId') ruleId: RuleId,
    @Query('language') language: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<RuleDetectionAssessment | null> {
    this.logger.info(
      'GET /standards/:standardId/rules/:ruleId/detection-assessment - Getting rule detection assessment',
      {
        standardId,
        ruleId,
        language,
        userId: request.user?.userId,
        organizationId: request.organization?.id,
      },
    );

    try {
      // Validate language parameter
      if (!language || language.trim() === '') {
        throw new BadRequestException('language query parameter is required');
      }

      const programmingLanguage = stringToProgrammingLanguage(language);
      if (!programmingLanguage) {
        throw new BadRequestException(
          `Invalid language: ${language}. Must be a valid programming language.`,
        );
      }

      const command: GetRuleDetectionAssessmentCommand = {
        organizationId: request.organization.id,
        userId: request.user.userId,
        ruleId,
        language: programmingLanguage as ProgrammingLanguage,
      };

      const response =
        await this.linterService.getRuleDetectionAssessment(command);

      this.logger.info(
        'GET /standards/:standardId/rules/:ruleId/detection-assessment - Assessment retrieved successfully',
        {
          standardId,
          ruleId,
          language,
          hasAssessment: response.assessment !== null,
        },
      );

      return response.assessment;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /standards/:standardId/rules/:ruleId/detection-assessment - Failed to get rule detection assessment',
        {
          standardId,
          ruleId,
          language,
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

  @Get('standards/:standardId/rules/:ruleId/detection-status')
  async getRuleLanguageDetectionStatus(
    @Param('standardId') standardId: StandardId,
    @Param('ruleId') ruleId: RuleId,
    @Query('language') language: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ status: string }> {
    this.logger.info(
      'GET /standards/:standardId/rules/:ruleId/detection-status - Getting rule language detection status',
      {
        standardId,
        ruleId,
        language,
        userId: request.user?.userId,
        organizationId: request.organization?.id,
      },
    );

    try {
      // Validate language parameter
      if (!language || language.trim() === '') {
        throw new BadRequestException('language query parameter is required');
      }

      const programmingLanguage = stringToProgrammingLanguage(language);
      if (!programmingLanguage) {
        throw new BadRequestException(
          `Invalid language: ${language}. Must be a valid programming language.`,
        );
      }

      const command: ComputeRuleLanguageDetectionStatusCommand = {
        ruleId,
        language: programmingLanguage as ProgrammingLanguage,
      };

      const response =
        await this.linterService.computeRuleLanguageDetectionStatus(command);

      this.logger.info(
        'GET /standards/:standardId/rules/:ruleId/detection-status - Detection status retrieved successfully',
        {
          standardId,
          ruleId,
          language,
          status: response.status,
        },
      );

      return { status: response.status };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /standards/:standardId/rules/:ruleId/detection-status - Failed to get detection status',
        {
          standardId,
          ruleId,
          language,
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

  @Get('standards/:standardId/detection-status')
  async getStandardRulesDetectionStatus(
    @Param('standardId') standardId: StandardId,
    @Req() request: AuthenticatedRequest,
  ): Promise<RuleDetectionStatusSummary[]> {
    this.logger.info(
      'GET /standards/:standardId/detection-status - Getting standard rules detection status',
      {
        standardId,
        userId: request.user?.userId,
        organizationId: request.organization?.id,
      },
    );

    try {
      const command: GetStandardRulesDetectionStatusCommand = {
        organizationId: request.organization.id,
        userId: request.user.userId,
        standardId,
      };

      const response =
        await this.linterService.getStandardRulesDetectionStatus(command);

      this.logger.info(
        'GET /standards/:standardId/detection-status - Standard rules detection status retrieved successfully',
        {
          standardId,
          rulesCount: response.rules.length,
        },
      );

      return response.rules;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /standards/:standardId/detection-status - Failed to get standard rules detection status',
        {
          standardId,
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

  @Get(
    'standards/:standardId/rules/:ruleId/detection-programs/:detectionProgramId/metadata',
  )
  async getDetectionProgramMetadata(
    @Param('standardId') standardId: StandardId,
    @Param('ruleId') ruleId: RuleId,
    @Param('detectionProgramId') detectionProgramId: DetectionProgramId,
    @Req() request: AuthenticatedRequest,
  ): Promise<DetectionProgramMetadata | null> {
    this.logger.info(
      'GET /standards/:standardId/rules/:ruleId/detection-programs/:detectionProgramId/metadata - Getting detection program metadata',
      {
        standardId,
        ruleId,
        detectionProgramId,
        userId: request.user?.userId,
        organizationId: request.organization?.id,
      },
    );

    try {
      const command: GetDetectionProgramMetadataCommand = {
        organizationId: request.organization.id,
        userId: request.user.userId,
        detectionProgramId,
      };

      const response =
        await this.linterService.getDetectionProgramMetadata(command);

      this.logger.info(
        'GET /standards/:standardId/rules/:ruleId/detection-programs/:detectionProgramId/metadata - Metadata retrieved successfully',
        {
          standardId,
          ruleId,
          detectionProgramId,
          hasMetadata: response.metadata !== null,
        },
      );

      return response.metadata;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /standards/:standardId/rules/:ruleId/detection-programs/:detectionProgramId/metadata - Failed to get metadata',
        {
          standardId,
          ruleId,
          detectionProgramId,
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

  @Post('list-draft-detection-program')
  async getDraftDetectionProgramForRule(
    @Body() body: { standardSlug: string; ruleId: string; language?: string },
    @Req() request: AuthenticatedRequest,
  ): Promise<{
    programs: DetectionProgram[];
    ruleContent: string;
    scope: string | null;
  }> {
    this.logger.info(
      'POST /list-draft-detection-program - Getting draft detection programs',
      {
        standardSlug: body?.standardSlug,
        ruleId: body?.ruleId,
        language: body?.language,
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
          'POST /list-draft-detection-program - Missing user or organization context',
          {
            userId,
            organizationId,
          },
        );
        throw new BadRequestException('User authentication required');
      }

      // Validate request body
      if (!body.standardSlug || typeof body.standardSlug !== 'string') {
        this.logger.error(
          'POST /list-draft-detection-program - standardSlug is required',
        );
        throw new BadRequestException('standardSlug is required');
      }

      if (!body.ruleId || typeof body.ruleId !== 'string') {
        this.logger.error(
          'POST /list-draft-detection-program - ruleId is required',
        );
        throw new BadRequestException('ruleId is required');
      }

      // Trim the inputs
      const standardSlug = body.standardSlug.trim();
      const ruleId = body.ruleId.trim();

      if (standardSlug === '' || ruleId === '') {
        this.logger.error(
          'POST /list-draft-detection-program - standardSlug and ruleId cannot be empty',
        );
        throw new BadRequestException(
          'standardSlug and ruleId cannot be empty',
        );
      }

      // Validate language if provided
      if (body.language) {
        try {
          stringToProgrammingLanguage(body.language);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            'POST /list-draft-detection-program - Invalid language parameter',
            {
              language: body.language,
              error: errorMessage,
            },
          );
          throw new BadRequestException(errorMessage);
        }
      }

      const command: GetDraftDetectionProgramForRuleCommand = {
        standardSlug,
        ruleId: ruleId as RuleId,
        organizationId,
        userId,
        language: body.language,
      };

      const response =
        await this.linterService.getDraftDetectionProgramForRule(command);

      this.logger.info(
        'POST /list-draft-detection-program - Draft detection programs retrieved successfully',
        {
          standardSlug,
          ruleId,
          language: body.language,
          organizationId: request.organization.id,
          programsCount: response.programs.length,
          ruleContent: response.ruleContent,
          scope: response.scope,
        },
      );

      return {
        programs: response.programs,
        ruleContent: response.ruleContent,
        scope: response.scope,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /list-draft-detection-program - Failed to get draft detection programs',
        {
          standardSlug: body?.standardSlug,
          ruleId: body?.ruleId,
          language: body?.language,
          organizationId: request.organization?.id,
          userId: request.user?.userId,
          error: errorMessage,
        },
      );

      // Handle specific error cases
      if (errorMessage.includes('not found')) {
        throw new NotFoundException(errorMessage);
      }

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(errorMessage);
    }
  }

  @Post(
    'standards/:standardId/rules/:ruleId/detection-program/:detectionProgramId/test',
  )
  async testDetectionProgram(
    @Param('standardId') standardId: StandardId,
    @Param('ruleId') ruleId: RuleId,
    @Param('detectionProgramId') detectionProgramId: DetectionProgramId,
    @Body() body: { sandboxCode: string; filePath?: string },
    @Req() request: AuthenticatedRequest,
  ): Promise<LinterExecutionViolation[]> {
    this.logger.info(
      'POST /standards/:standardId/rules/:ruleId/detection-program/:detectionProgramId/test - Testing detection program',
      {
        standardId,
        ruleId,
        detectionProgramId,
        sandboxCodeLength: body?.sandboxCode?.length,
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
          'POST /standards/:standardId/rules/:ruleId/detection-program/:detectionProgramId/test - Missing user or organization context',
          {
            standardId,
            ruleId,
            detectionProgramId,
          },
        );
        throw new BadRequestException('User authentication required');
      }

      // Validate request body
      if (!body.sandboxCode || typeof body.sandboxCode !== 'string') {
        this.logger.error(
          'POST /standards/:standardId/rules/:ruleId/detection-program/:detectionProgramId/test - sandboxCode is required',
        );
        throw new BadRequestException('sandboxCode is required');
      }

      if (body.sandboxCode.trim() === '') {
        this.logger.error(
          'POST /standards/:standardId/rules/:ruleId/detection-program/:detectionProgramId/test - sandboxCode cannot be empty',
        );
        throw new BadRequestException('sandboxCode cannot be empty');
      }

      const command: TestProgramExecutionCommand = {
        organizationId,
        userId,
        detectionProgramId,
        sandboxCode: body.sandboxCode,
        filePath: body.filePath,
      };

      const response = await this.linterService.testProgramExecution(command);

      this.logger.info(
        'POST /standards/:standardId/rules/:ruleId/detection-program/:detectionProgramId/test - Program tested successfully',
        {
          standardId,
          ruleId,
          detectionProgramId,
          violationsCount: response.violations.length,
        },
      );

      return response.violations;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /standards/:standardId/rules/:ruleId/detection-program/:detectionProgramId/test - Failed to test detection program',
        {
          standardId,
          ruleId,
          detectionProgramId,
          sandboxCodeLength: body?.sandboxCode?.length,
          error: errorMessage,
        },
      );

      if (error instanceof DetectionProgramNotFoundError) {
        throw new NotFoundException(errorMessage);
      }

      if (error instanceof UnauthorizedTestProgramExecutionError) {
        throw new ForbiddenException(errorMessage);
      }

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new BadRequestException(errorMessage);
    }
  }

  @Post('list-active-detection-program')
  async getActiveDetectionProgramForRule(
    @Body() body: { standardSlug: string; ruleId: string; language?: string },
    @Req() request: AuthenticatedRequest,
  ): Promise<{
    programs: DetectionProgram[];
    ruleContent: string;
    scope: string | null;
  }> {
    this.logger.info(
      'POST /list-active-detection-program - Getting active detection programs',
      {
        standardSlug: body?.standardSlug,
        ruleId: body?.ruleId,
        language: body?.language,
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
          'POST /list-active-detection-program - Missing user or organization context',
          {
            userId,
            organizationId,
          },
        );
        throw new BadRequestException('User authentication required');
      }

      // Validate request body
      if (!body.standardSlug || typeof body.standardSlug !== 'string') {
        this.logger.error(
          'POST /list-active-detection-program - standardSlug is required',
        );
        throw new BadRequestException('standardSlug is required');
      }

      if (!body.ruleId || typeof body.ruleId !== 'string') {
        this.logger.error(
          'POST /list-active-detection-program - ruleId is required',
        );
        throw new BadRequestException('ruleId is required');
      }

      // Trim the inputs
      const standardSlug = body.standardSlug.trim();
      const ruleId = body.ruleId.trim();

      if (standardSlug === '' || ruleId === '') {
        this.logger.error(
          'POST /list-active-detection-program - standardSlug and ruleId cannot be empty',
        );
        throw new BadRequestException(
          'standardSlug and ruleId cannot be empty',
        );
      }

      // Validate language if provided
      if (body.language) {
        try {
          stringToProgrammingLanguage(body.language);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            'POST /list-active-detection-program - Invalid language parameter',
            {
              language: body.language,
              error: errorMessage,
            },
          );
          throw new BadRequestException(errorMessage);
        }
      }

      const command: GetActiveDetectionProgramForRuleCommand = {
        standardSlug,
        ruleId: ruleId as RuleId,
        organizationId,
        userId,
        language: body.language,
      };

      const response =
        await this.linterService.getActiveDetectionProgramForRule(command);

      this.logger.info(
        'POST /list-active-detection-program - Active detection programs retrieved successfully',
        {
          standardSlug,
          ruleId,
          language: body.language,
          organizationId: request.organization.id,
          programsCount: response.programs.length,
          ruleContent: response.ruleContent,
          scope: response.scope,
        },
      );

      return {
        programs: response.programs,
        ruleContent: response.ruleContent,
        scope: response.scope,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /list-active-detection-program - Failed to get active detection programs',
        {
          standardSlug: body?.standardSlug,
          ruleId: body?.ruleId,
          language: body?.language,
          organizationId: request.organization?.id,
          userId: request.user?.userId,
          error: errorMessage,
        },
      );

      // Handle specific error cases
      if (errorMessage.includes('not found')) {
        throw new NotFoundException(errorMessage);
      }

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(errorMessage);
    }
  }

  @Put(
    'standards/:standardId/rules/:ruleId/detection-heuristics/:detectionHeuristicsId',
  )
  async updateRuleDetectionHeuristics(
    @Param('standardId') standardId: StandardId,
    @Param('ruleId') ruleId: RuleId,
    @Param('detectionHeuristicsId')
    detectionHeuristicsId: DetectionHeuristicsId,
    @Req() request: AuthenticatedRequest,
    @Body()
    body: {
      heuristics: string[];
      clarificationQuestion?: {
        question: string;
        answer: string;
      };
    },
  ): Promise<DetectionHeuristics> {
    const organizationId = request.organization.id;
    const userId = request.user.userId;

    this.logger.info('Updating rule detection heuristics', {
      standardId,
      ruleId,
      detectionHeuristicsId,
      organizationId,
      userId,
    });

    try {
      // Update the heuristics
      const command: UpdateRuleDetectionHeuristicsCommand = {
        userId,
        organizationId,
        detectionHeuristicsId,
        heuristics: body.heuristics,
        clarificationQuestion: body.clarificationQuestion,
      };

      const response =
        await this.linterService.updateRuleDetectionHeuristics(command);

      this.logger.info('Rule detection heuristics updated successfully', {
        detectionHeuristicsId,
        ruleId,
      });

      return response.detectionHeuristics;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to update rule detection heuristics', {
        standardId,
        ruleId,
        detectionHeuristicsId,
        organizationId,
        userId,
        error: errorMessage,
      });

      if (errorMessage.includes('not found')) {
        throw new NotFoundException(errorMessage);
      }

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new BadRequestException(errorMessage);
    }
  }

  @Get('standards/:standardId/rules/:ruleId/detection-heuristics')
  async getDetectionHeuristics(
    @Param('standardId') standardId: StandardId,
    @Param('ruleId') ruleId: RuleId,
    @Query('language') languageParam: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<DetectionHeuristics | null> {
    const organizationId = request.organization.id;
    const userId = request.user.userId;

    this.logger.info('Getting detection heuristics', {
      standardId,
      ruleId,
      language: languageParam,
      organizationId,
      userId,
    });

    try {
      // Parse and validate language parameter
      if (!languageParam) {
        throw new BadRequestException('Language query parameter is required');
      }

      let language: ProgrammingLanguage;
      try {
        language = stringToProgrammingLanguage(languageParam);
      } catch (error) {
        throw new BadRequestException(
          `Invalid language: ${languageParam}. ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      // Get the heuristics
      const command: GetDetectionHeuristicsCommand = {
        userId,
        organizationId,
        ruleId,
        language,
      };

      const response = await this.linterService.getDetectionHeuristics(command);

      if (response.detectionHeuristics) {
        this.logger.info('Detection heuristics found', {
          ruleId,
          language,
          detectionHeuristicsId: response.detectionHeuristics.id,
        });
        return response.detectionHeuristics;
      }

      // If heuristics don't exist, create them
      this.logger.info('Detection heuristics not found, creating new', {
        ruleId,
        language,
      });

      const createResponse =
        await this.linterService.createDetectionHeuristics(command);

      this.logger.info('Detection heuristics created', {
        ruleId,
        language,
        detectionHeuristicsId: createResponse.detectionHeuristics.id,
      });

      return createResponse.detectionHeuristics;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to get detection heuristics', {
        standardId,
        ruleId,
        language: languageParam,
        organizationId,
        userId,
        error: errorMessage,
      });

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new BadRequestException(errorMessage);
    }
  }
}
