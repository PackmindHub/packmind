// This import MUST be first - before any other imports
import './instrument';

/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app/app.module';
import {
  PackmindLogger,
  LogLevel,
  Configuration,
  Cache,
} from '@packmind/shared';

const logger = new PackmindLogger('PackmindAPI', LogLevel.INFO);

/**
 * Get CORS origins from configuration with fallback
 */
async function getCorsOrigins(): Promise<string[] | boolean> {
  // In development, use hardcoded localhost origins
  if (process.env.NODE_ENV !== 'production') {
    const devOrigins = [
      'http://localhost:4200', // Angular dev server (if used)
      'http://localhost:5173', // Vite dev server (default for React/Vue)
      'http://localhost:3000', // Common React dev server port
    ];
    logger.debug('Using development CORS origins', { origins: devOrigins });
    return devOrigins;
  }

  // In production, try to get from Configuration service
  try {
    const corsOriginsConfig = await Configuration.getConfig('CORS_ORIGINS');
    if (corsOriginsConfig) {
      const origins = corsOriginsConfig
        .split(',')
        .map((origin) => origin.trim());
      logger.info('CORS origins loaded from configuration', { origins });
      return origins;
    }
  } catch (error) {
    logger.warn('Failed to load CORS origins from configuration', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Fallback: allow all origins in production (less secure but maximum flexibility)
  logger.warn(
    'No CORS origins configured, allowing all origins. This may be a security risk in production.',
  );
  return true; // This allows all origins
}

/**
 * Initialize global Cache instance
 */
async function initializeCache(): Promise<void> {
  logger.info('Initializing global cache...');

  try {
    const cache = Cache.getInstance();
    await cache.initialize();

    logger.info('Global cache initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize global cache', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Continue without cache if initialization fails - cache operations will handle gracefully
    logger.warn('Continuing without cache - cache operations will be skipped');
  }
}

async function bootstrap() {
  try {
    logger.info('Starting Packmind API server', {
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });

    const app = await NestFactory.create(AppModule);

    // Enable cookie parsing
    app.use(cookieParser());
    logger.debug('Cookie parser enabled');

    // Enable CORS with dynamic origins
    const corsOrigins = await getCorsOrigins();
    app.enableCors({
      origin: corsOrigins,
      credentials: true, // Enable credentials to support cookies
    });
    logger.info('CORS enabled', {
      allowedOrigins: corsOrigins === true ? 'All origins' : corsOrigins,
      credentials: true,
    });

    // Enable API versioning
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '0',
    });
    logger.info('API versioning enabled', {
      type: 'URI',
      defaultVersion: '0',
    });

    const globalPrefix = 'api';
    app.setGlobalPrefix(globalPrefix);
    logger.debug('Global prefix set', { prefix: globalPrefix });

    // Initialize global cache before starting the server
    await initializeCache();

    const port = process.env.PORT || 3000;
    const host = process.env.HOST || 'localhost';

    await app.listen(port);

    logger.info('🚀 Packmind API server started successfully', {
      url: `http://${host}:${port}/${globalPrefix}/v0`,
      port: port,
      host: host,
      prefix: globalPrefix,
      version: 'v0',
      pid: process.pid,
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      logger.warn(`Received ${signal}, starting graceful shutdown`, {
        signal,
        pid: process.pid,
        uptime: process.uptime(),
      });

      app
        .close()
        .then(async () => {
          // Cleanup cache connection
          try {
            const cache = Cache.getInstance();
            await cache.disconnect();
            logger.info('Cache disconnected gracefully');
          } catch (error) {
            logger.warn('Error disconnecting cache during shutdown', {
              error: error instanceof Error ? error.message : String(error),
            });
          }

          logger.info('✅ Packmind API server shut down gracefully', {
            signal,
            shutdownTime: new Date().toISOString(),
            totalUptime: process.uptime(),
          });
          process.exit(0);
        })
        .catch((error) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.error('❌ Error during graceful shutdown', {
            signal,
            error: errorMessage,
            shutdownTime: new Date().toISOString(),
          });
          process.exit(1);
        });
    };

    // Register shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('❌ Uncaught exception - shutting down', {
        error: error.message,
        stack: error.stack,
        pid: process.pid,
      });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      const errorMessage =
        reason instanceof Error ? reason.message : JSON.stringify(reason);
      logger.error('❌ Unhandled promise rejection - shutting down', {
        reason: errorMessage,
        pid: process.pid,
      });
      process.exit(1);
    });

    Logger.log(
      `🚀 Application is running on: http://${host}:${port}/${globalPrefix}/v0`,
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('❌ Failed to start Packmind API server', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

bootstrap();
