import { FastifyInstance } from 'fastify';

// Manual imports for bundled build
import sensiblePlugin from './plugins/sensible';
import rateLimitPlugin from './plugins/rate-limit';
import jwtAuthPlugin from './plugins/jwt-auth';
import rootRoutes from './routes/root';

/* eslint-disable-next-line */
export interface AppOptions {}

export async function app(fastify: FastifyInstance, opts: AppOptions) {
  // Place here your custom code!

  // Manual plugin registration for bundled build
  await fastify.register(sensiblePlugin, opts);
  await fastify.register(rateLimitPlugin, opts);
  await fastify.register(jwtAuthPlugin, opts);

  // Manual route registration for bundled build
  await fastify.register(rootRoutes, opts);
}
