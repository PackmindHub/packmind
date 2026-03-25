import { Module } from '@nestjs/common';
import { OrganizationsSpacesChangeProposalsModuleController } from './change-proposal.controller';
import { OrganizationsSpacesChangeProposalsService } from './change-proposal.service';

@Module({
  imports: [],
  controllers: [OrganizationsSpacesChangeProposalsModuleController],
  providers: [OrganizationsSpacesChangeProposalsService],
})
export class OrganizationsSpacesChangeProposalsModule {}
