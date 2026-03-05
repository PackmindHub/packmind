import { FileUpdates } from '@packmind/types';
import { ISkillDeployer } from './IDefaultSkillDeployer';
import { LICENSE_TXT } from './license';
import { getSkillMd } from './skills/update-playbook/skill';
import { README } from './skills/update-playbook/readme';
import { DOMAIN_STANDARDS } from './skills/update-playbook/references/domain-standards';
import { DOMAIN_SKILLS } from './skills/update-playbook/references/domain-skills';
import { DOMAIN_COMMANDS } from './skills/update-playbook/references/domain-commands';

export class UpdatePlaybookDeployer implements ISkillDeployer {
  public readonly slug = 'packmind-update-playbook';
  public readonly minimumVersion = '0.21.0';

  deploy(_agentName: string, skillsFolderPath: string): FileUpdates {
    const basePath = `${skillsFolderPath}packmind-update-playbook`;

    return {
      createOrUpdate: [
        { path: `${basePath}/SKILL.md`, content: getSkillMd() },
        { path: `${basePath}/README.md`, content: README },
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
      ],
      delete: [],
    };
  }
}
