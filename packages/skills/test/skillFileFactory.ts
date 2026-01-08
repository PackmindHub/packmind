import { Factory } from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';
import {
  createSkillFileId,
  createSkillVersionId,
  SkillFile,
} from '@packmind/types';

export const skillFileFactory: Factory<SkillFile> = (
  skillFile?: Partial<SkillFile>,
) => {
  return {
    id: createSkillFileId(uuidv4()),
    skillVersionId: createSkillVersionId(uuidv4()),
    path: 'SKILL.md',
    content: '---\nname: test-skill\ndescription: Test skill\n---\n\nContent',
    permissions: 'rw-r--r--',
    ...skillFile,
  };
};
