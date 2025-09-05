import 'reflect-metadata';
import { FastifyInstance } from 'fastify';

import dbConnection from 'typeorm-fastify-plugin';

import { recipesSchemas } from '@packmind/recipes';
import { gitSchemas } from '@packmind/git';
import { accountsSchemas } from '@packmind/accounts';
import { standardsSchemas } from '@packmind/standards';
import { recipesUsageSchemas } from '@packmind/analytics';

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
    ],
    synchronize: false,
  });
}
