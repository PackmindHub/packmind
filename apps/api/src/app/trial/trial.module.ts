import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Configuration } from '@packmind/node-utils';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { TrialController } from './trial.controller';
import { TrialTokenService } from './trial-token.service';

const logger = new PackmindLogger('TrialModule', LogLevel.INFO);

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: async () => {
        const secret = await Configuration.getConfig(
          'MCP_JWT_SECRET_KEY',
          process.env,
          logger,
        );
        return {
          secret: secret || 'trial-fallback-secret-for-development',
          signOptions: {
            expiresIn: '30d',
            issuer: 'packmind-trial',
          },
        };
      },
    }),
  ],
  controllers: [TrialController],
  providers: [
    TrialTokenService,
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('TrialModule', LogLevel.INFO),
    },
  ],
})
export class TrialModule {}
