import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ChangeProposalCaptureMode,
  ChangeProposalType,
  CreateChangeProposalCommand,
  CreateChangeProposalResponse,
  OrganizationId,
} from '@packmind/types';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import {
  ChangeProposalPayloadMismatchError,
  UnsupportedChangeProposalTypeError,
} from '@packmind/playbook-change-management';
import { OrganizationAccessGuard } from '../guards/organization-access.guard';
import { OrganizationChangeProposalsService } from './change-proposals.service';

const origin = 'OrganizationChangeProposalsController';

interface CreateChangeProposalBody {
  type: ChangeProposalType;
  artefactId: string;
  payload: unknown;
  captureMode: ChangeProposalCaptureMode;
}

@Controller()
@UseGuards(OrganizationAccessGuard)
export class OrganizationChangeProposalsController {
  constructor(
    private readonly changeProposalsService: OrganizationChangeProposalsService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('OrganizationChangeProposalsController initialized');
  }

  @Post()
  async createChangeProposal(
    @Param('orgId') organizationId: OrganizationId,
    @Body() body: CreateChangeProposalBody,
    @Req() request: AuthenticatedRequest,
  ): Promise<CreateChangeProposalResponse<ChangeProposalType>> {
    this.logger.info(
      'POST /organizations/:orgId/changeProposals - Creating change proposal',
      {
        organizationId,
        type: body.type,
      },
    );

    try {
      const command = {
        userId: request.user.userId,
        organizationId,
        type: body.type,
        artefactId: body.artefactId,
        payload: body.payload,
        captureMode: body.captureMode,
      } as unknown as CreateChangeProposalCommand<ChangeProposalType>;

      const result =
        await this.changeProposalsService.createChangeProposal(command);

      this.logger.info(
        'POST /organizations/:orgId/changeProposals - Change proposal created successfully',
        {
          organizationId,
          type: body.type,
        },
      );

      return result;
    } catch (error) {
      if (error instanceof UnsupportedChangeProposalTypeError) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof ChangeProposalPayloadMismatchError) {
        throw new ConflictException(error.message);
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/changeProposals - Failed to create change proposal',
        {
          organizationId,
          type: body.type,
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
