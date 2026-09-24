import {
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

    const result = await this.playbookService.applyPlaybook({
      userId,
      organizationId: orgId,
      proposals: body.proposals,
      message: body.message,
      directUpdate: body.directUpdate,
    });

    if (!result.success) {
      throw new UnprocessableEntityException(result);
    }

    return result;
  }
}
