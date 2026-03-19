import { Module } from '@nestjs/common';
import { SpacesManagementController } from './spaces-management.controller';
import { SpacesManagementService } from './spaces-management.service';

@Module({
  imports: [],
  controllers: [SpacesManagementController],
  providers: [SpacesManagementService],
})
export class SpacesManagementModule {}
