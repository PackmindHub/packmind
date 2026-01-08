import { Factory } from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';
import {
  createUserId,
  createSkillId,
  createSkillVersionId,
  SkillVersion,
} from '@packmind/types';

export const skillVersionFactory: Factory<SkillVersion> = (
  skillVersion?: Partial<SkillVersion>,
) => {
  return {
    id: createSkillVersionId(uuidv4()),
    skillId: createSkillId(uuidv4()),
    version: 1,
    name: 'Test Skill',
    slug: 'test-skill',
    description: 'Test skill version description',
    prompt: 'This is a test skill version prompt for unit testing',
    userId: createUserId(uuidv4()),
    license: 'MIT',
    compatibility: 'All environments',
    metadata: { category: 'test', tags: 'testing' },
    allowedTools: 'Read,Write,Bash',
    ...skillVersion,
  };
};
