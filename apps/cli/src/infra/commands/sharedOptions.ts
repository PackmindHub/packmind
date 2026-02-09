import { option, optional, string } from 'cmd-ts';

export const originSkillOption = option({
  long: 'origin-skill',
  description: 'Name of the skill that triggered this command',
  type: optional(string),
});
