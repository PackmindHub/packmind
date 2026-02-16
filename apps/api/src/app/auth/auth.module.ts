import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { WorkOsService } from './workos.service';
import { PackmindLogger, LogLevel } from '@packmind/logger';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [
    AuthService,
    WorkOsService,
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('AuthService', LogLevel.INFO),
    },
  ],
  exports: [AuthService, WorkOsService],
})
export class AuthModule {}
