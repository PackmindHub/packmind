import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Configuration } from '@packmind/node-utils';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';

const logger = new PackmindLogger('OrganizationMcpModule', LogLevel.INFO);

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
          secret: secret || 'mcp-fallback-secret-for-development',
          signOptions: {
            expiresIn: '30d',
            issuer: 'packmind-mcp',
          },
        };
      },
    }),
  ],
  controllers: [McpController],
  providers: [
    McpService,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('OrganizationMcpModule', LogLevel.INFO),
    },
  ],
  exports: [McpService],
})
export class OrganizationMcpModule {}
