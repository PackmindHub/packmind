import { FastifyInstance } from 'fastify';
import 'reflect-metadata';

import dbConnection from 'typeorm-fastify-plugin';

import { accountsSchemas } from '@packmind/accounts';
import { deploymentsSchemas } from '@packmind/deployments';
import { gitSchemas } from '@packmind/git';
import { linterSchemas } from '@packmind/editions';
import { commandsSchemas } from '@packmind/commands';
import { llmSchemas } from '@packmind/llm';
import { spacesSchemas } from '@packmind/spaces';
import { standardsSchemas } from '@packmind/standards';
import { skillsSchemas } from '@packmind/skills';

export async function registerDb(fastify: FastifyInstance) {
  fastify.register(dbConnection, {
    url: process.env.DATABASE_URL,
    type: 'postgres',
    logging: false,
    entities: [
      ...commandsSchemas,
      ...gitSchemas,
      ...accountsSchemas,
      ...spacesSchemas,
      ...standardsSchemas,
      ...skillsSchemas,
      ...deploymentsSchemas,
      ...linterSchemas,
      ...llmSchemas,
    ],
    synchronize: false,
  });
}
