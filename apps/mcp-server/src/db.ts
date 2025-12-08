import { FastifyInstance } from 'fastify';
import 'reflect-metadata';

import dbConnection from 'typeorm-fastify-plugin';

import { accountsSchemas } from '@packmind/accounts';
import { recipesUsageSchemas } from '@packmind/analytics';
import { deploymentsSchemas } from '@packmind/deployments';
import { gitSchemas } from '@packmind/git';
import { linterSchemas } from '@packmind/linter';
import { recipesSchemas } from '@packmind/recipes';
import { llmSchemas } from '@packmind/llm';
import { spacesSchemas } from '@packmind/spaces';
import { standardsSchemas } from '@packmind/standards';

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
      ...llmSchemas,
    ],
    synchronize: false,
  });
}
