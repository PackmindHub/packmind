import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  Req,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { ApplyPlaybookProposalItem } from '@packmind/types';
import { SkillValidationError } from '@packmind/skills';
import { OrganizationAccessGuard } from '../guards/organization-access.guard';
import { PlaybookService } from './playbook.service';

const origin = 'PlaybookController';

class ApplyPlaybookBody {
  proposals!: ApplyPlaybookProposalItem[];
  message!: string;
  directUpdate?: boolean;
}

@Controller()
@UseGuards(OrganizationAccessGuard)
export class PlaybookController {
  private readonly logger = new PackmindLogger(origin);

  constructor(private readonly playbookService: PlaybookService) {}

  @Post('apply')
  @HttpCode(200)
  async apply(
    @Req() request: AuthenticatedRequest,
    @Param('orgId') orgId: string,
    @Body() body: ApplyPlaybookBody,
  ) {
    const userId = request.user.userId;

    this.logger.info('Apply playbook request received', {
      userId: userId.substring(0, 6) + '*',
      organizationId: orgId,
      proposalCount: body.proposals.length,
    });

    let result;
    try {
      result = await this.playbookService.applyPlaybook({
        userId,
        organizationId: orgId,
        proposals: body.proposals,
        message: body.message,
        directUpdate: body.directUpdate,
      });
    } catch (error) {
      if (error instanceof SkillValidationError) {
        this.logger.warn('Skill validation failed on playbook apply', {
          userId: userId.substring(0, 6) + '*',
          organizationId: orgId,
          errors: error.errors,
        });
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    if (!result.success) {
      throw new UnprocessableEntityException(result);
    }

    return result;
  }
}
