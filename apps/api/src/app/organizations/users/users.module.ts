import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { LogLevel, PackmindLogger } from '@packmind/logger';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('OrganizationsUsersModule', LogLevel.INFO),
    },
  ],
})
export class OrganizationsUsersModule {}
