import 'reflect-metadata';
import { FastifyInstance } from 'fastify';

import dbConnection from 'typeorm-fastify-plugin';

import { recipesSchemas } from '@packmind/recipes';
import { gitSchemas } from '@packmind/git';
import { accountsSchemas } from '@packmind/accounts';
import { standardsSchemas } from '@packmind/standards';
import { recipesUsageSchemas } from '@packmind/analytics';
import { deploymentsSchemas } from '@packmind/deployments';
import { spacesSchemas } from '@packmind/spaces';
import { linterSchemas } from '@packmind/linter';

export async function registerDb(fastify: FastifyInstance) {
  fastify.register(dbConnection, {
    url: process.env.DATABASE_URL,
    type: 'postgres',
    logging: false,
    entities: [
      ...recipesSchemas,
      ...recipesUsageSchemas,
      ...gitSchemas,
      ...accountsSchemas,
      ...standardsSchemas,
      ...deploymentsSchemas,
      ...spacesSchemas,
      ...linterSchemas,
    ],
    synchronize: false,
  });
}
