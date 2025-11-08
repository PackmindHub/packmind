import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PackmindLogger, LogLevel } from '@packmind/logger';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('AuthService', LogLevel.INFO),
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
