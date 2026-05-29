import { Module } from '@nestjs/common';
import { GitProvidersController } from './git-providers.controller';
import { GitProvidersService } from './git-providers.service';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { AuthModule } from '../../../auth/auth.module';
import { Configuration } from '@packmind/node-utils';
import { InstallStateSigner } from '@packmind/git';
import { INSTALL_STATE_SIGNER } from './git-providers.tokens';

export { INSTALL_STATE_SIGNER };

@Module({
  imports: [AuthModule],
  controllers: [GitProvidersController],
  providers: [
    GitProvidersService,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('OrganizationGitProvidersModule', LogLevel.INFO),
    },
    {
      provide: INSTALL_STATE_SIGNER,
      useFactory: async () => {
        const key = await Configuration.getConfig('ENCRYPTION_KEY');
        if (!key) {
          throw new Error(
            'ENCRYPTION_KEY is required to sign GitHub App install state',
          );
        }
        return new InstallStateSigner(key);
      },
    },
  ],
  exports: [GitProvidersService],
})
export class OrganizationGitProvidersModule {}
