import { Factory } from '@packmind/test-utils';
import {
  createSpaceId,
  createUserId,
  Command,
  createCommandId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

export const commandFactory: Factory<Command> = (recipe?: Partial<Command>) => {
  return {
    id: createCommandId(uuidv4()),
    name: 'Test Recipe',
    slug: 'test-recipe',
    content: 'Test content',
    version: 1,
    userId: createUserId(uuidv4()),
    spaceId: createSpaceId(uuidv4()),
    movedTo: null,
    ...recipe,
  };
};
