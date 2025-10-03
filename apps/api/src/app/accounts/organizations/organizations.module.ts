import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { LogLevel, PackmindLogger } from '@packmind/shared';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('OrganizationsModule', LogLevel.INFO),
    },
  ],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
