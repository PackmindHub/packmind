import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { LogLevel, PackmindLogger } from '@packmind/logger';

const CLI_USER_AGENT_REGEX = /^packmind-cli:(.+)$/;

@Injectable()
export class CliVersionLoggerMiddleware implements NestMiddleware {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      'CliVersionLogger',
      LogLevel.INFO,
    ),
  ) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const userAgent = req.headers['user-agent'];

    if (typeof userAgent === 'string') {
      const match = CLI_USER_AGENT_REGEX.exec(userAgent);
      if (match) {
        this.logger.info('Packmind CLI request', {
          cliVersion: match[1],
          userAgent,
          method: req.method,
          path: req.originalUrl ?? req.url,
        });
      }
    }

    next();
  }
}
