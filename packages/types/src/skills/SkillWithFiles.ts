import { Skill } from './Skill';
import { SkillFile } from './SkillFile';
import { SkillVersion } from './SkillVersion';

export type SkillWithFiles = {
  skill: Skill;
  files: SkillFile[];
  latestVersion: SkillVersion;
};
