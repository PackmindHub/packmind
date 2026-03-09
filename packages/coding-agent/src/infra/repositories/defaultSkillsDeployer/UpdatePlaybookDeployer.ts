import { FileUpdates } from '@packmind/types';
import { ISkillDeployer } from './IDefaultSkillDeployer';
import { LICENSE_TXT } from './license';
import { getSkillMd } from './skills/packmind-update-playbook/skill';
import { AGENT_SKILLS_SPECIFICATION } from './skills/packmind-update-playbook/references/agent-skills-specification';
import { DOMAIN_STANDARDS } from './skills/packmind-update-playbook/references/domain-standards';
import { DOMAIN_SKILLS } from './skills/packmind-update-playbook/references/domain-skills';
import { DOMAIN_COMMANDS } from './skills/packmind-update-playbook/references/domain-commands';

export class UpdatePlaybookDeployer implements ISkillDeployer {
  public readonly slug = 'packmind-update-playbook';
  public readonly minimumVersion = '0.21.0';

  deploy(_agentName: string, skillsFolderPath: string): FileUpdates {
    const basePath = `${skillsFolderPath}packmind-update-playbook`;

    return {
      createOrUpdate: [
        { path: `${basePath}/SKILL.md`, content: getSkillMd() },
        { path: `${basePath}/LICENSE.txt`, content: LICENSE_TXT },
        {
          path: `${basePath}/references/domain-standards.md`,
          content: DOMAIN_STANDARDS,
        },
        {
          path: `${basePath}/references/domain-skills.md`,
          content: DOMAIN_SKILLS,
        },
        {
          path: `${basePath}/references/domain-commands.md`,
          content: DOMAIN_COMMANDS,
        },
        {
          path: `${basePath}/references/agent-skills-specification.md`,
          content: AGENT_SKILLS_SPECIFICATION,
        },
      ],
      delete: [],
    };
  }
}
