import { Factory } from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';
import {
  createUserId,
  createSkillId,
  Skill,
  createSpaceId,
} from '@packmind/types';

export const skillFactory: Factory<Skill> = (skill?: Partial<Skill>) => {
  return {
    id: createSkillId(uuidv4()),
    spaceId: createSpaceId(uuidv4()),
    name: 'Test Skill',
    slug: 'test-skill',
    description: 'Test skill description',
    version: 1,
    prompt: 'This is a test skill prompt for unit testing',
    userId: createUserId(uuidv4()),
    license: 'MIT',
    compatibility: 'All environments',
    metadata: { category: 'test', tags: 'testing' },
    allowedTools: 'Read,Write,Bash',
    ...skill,
  };
};
