import { Module } from '@nestjs/common';
import { GitProvidersController } from './git-providers.controller';
import { GitProvidersService } from './git-providers.service';
import { PackmindLogger, LogLevel } from '@packmind/shared';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [GitProvidersController],
  providers: [
    GitProvidersService,
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('GitProvidersModule', LogLevel.INFO),
    },
  ],
  exports: [GitProvidersService],
})
export class GitProvidersModule {}
