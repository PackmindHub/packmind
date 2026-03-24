import { BadRequestException, Controller, Post } from '@nestjs/common';

@Controller()
export class OrganizationsSpacesChangeProposalsModuleController {
  @Post('check')
  checkChangeProposals(): never {
    throw new BadRequestException(
      'This feature is available in Enterprise Edition',
    );
  }
}
