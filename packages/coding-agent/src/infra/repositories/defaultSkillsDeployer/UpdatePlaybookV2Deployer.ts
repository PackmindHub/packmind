import { FileUpdates } from '@packmind/types';
import { ISkillDeployer } from './IDefaultSkillDeployer';
import { LICENSE_TXT } from './license';
import { getSkillMd } from './skills/packmind-update-playbook-v2/skill';
import { AGENT_SKILLS_SPECIFICATION } from './skills/packmind-update-playbook-v2/references/agent-skills-specification';
import { DOMAIN_STANDARDS } from './skills/packmind-update-playbook-v2/references/domain-standards';
import { DOMAIN_SKILLS } from './skills/packmind-update-playbook-v2/references/domain-skills';
import { DOMAIN_COMMANDS } from './skills/packmind-update-playbook-v2/references/domain-commands';

export class UpdatePlaybookV2Deployer implements ISkillDeployer {
  public readonly slug = 'packmind-update-playbook-v2';
  public readonly minimumVersion = 'unreleased' as const;

  deploy(_agentName: string, skillsFolderPath: string): FileUpdates {
    const basePath = `${skillsFolderPath}packmind-update-playbook-v2`;

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
