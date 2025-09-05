// This import MUST be first - before any other imports
import './instrument';

import * as Sentry from '@sentry/node';
import Fastify from 'fastify';
import { app } from './app/app';
import { registerDb } from './db';
import { registerHexaRegistry } from './hexa-registry';
import { PackmindLogger, LogLevel } from '@packmind/shared';
import { Configuration } from '@packmind/shared';

const logger = new PackmindLogger('PackmindMCPServer', LogLevel.INFO);

const host = process.env.HOST ?? '0.0.0.0';
const port = process.env.PORT ? Number(process.env.PORT) : 3001;

async function startServer() {
  try {
    logger.info('Starting Packmind MCP Server', {
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      host,
      port,
    });

    // Get JWT secret from Configuration with fallback
    const jwtSecret = await Configuration.getConfig(
      'MCP_JWT_SECRET_KEY',
      process.env,
      logger,
    );
    if (!jwtSecret) {
      process.env.JWT_SECRET = 'fallback-secret-for-development';
      logger.warn(
        'MCP_JWT_SECRET_KEY not found in configuration, using fallback value. This is not secure for production.',
      );
    } else {
      process.env.JWT_SECRET = jwtSecret;
      logger.info('JWT secret loaded from configuration successfully');
    }

    // Instantiate Fastify with some config
    const server = Fastify({
      logger: true,
    });
    if (Sentry.isEnabled() && Sentry.isInitialized()) {
      logger.info('Sentry is enabled, setting up error handler for Fastify');
      Sentry.setupFastifyErrorHandler(server);
    }

    logger.debug('Fastify instance created', { host, port });

    // Register database
    registerDb(server);
    logger.info('Database registered successfully');

    // Register AppRegistry (must be after database registration)
    await server.register(registerHexaRegistry);
    logger.info('AppRegistry registered successfully');

    // Register your application as a normal plugin.
    server.register(app);
    logger.debug('Application plugin registered');

    // Start listening.
    await server.listen({ port, host });

    logger.info('🚀 Packmind MCP Server started successfully', {
      url: `http://${host}:${port}`,
      host,
      port,
      pid: process.pid,
    });

    console.log(`[ MCP Server ready ] http://${host}:${port}`);

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      logger.warn(`Received ${signal}, starting graceful shutdown`, {
        signal,
        pid: process.pid,
        uptime: process.uptime(),
      });

      try {
        await server.close();
        logger.info('✅ Packmind MCP Server shut down gracefully', {
          signal,
          shutdownTime: new Date().toISOString(),
          totalUptime: process.uptime(),
        });
        process.exit(0);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error('❌ Error during graceful shutdown', {
          signal,
          error: errorMessage,
          shutdownTime: new Date().toISOString(),
        });
        process.exit(1);
      }
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('❌ Failed to start Packmind MCP Server', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      host,
      port,
    });
    process.exit(1);
  }
}

startServer();
