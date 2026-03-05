import { FileUpdates } from '@packmind/types';
import { ISkillDeployer } from './IDefaultSkillDeployer';
import { LICENSE_TXT } from './license';
import { getSkillMd } from './skills/packmind-cli-list-commands/skill';
import { README } from './skills/packmind-cli-list-commands/readme';

export class CliListCommandsDeployer implements ISkillDeployer {
  public readonly slug = 'packmind-cli-list-commands';
  public readonly minimumVersion = '0.15.0';

  deploy(_agentName: string, skillsFolderPath: string): FileUpdates {
    const basePath = `${skillsFolderPath}packmind-cli-list-commands`;

    return {
      createOrUpdate: [
        {
          path: `${basePath}/SKILL.md`,
          content: getSkillMd(),
        },
        {
          path: `${basePath}/README.md`,
          content: README,
        },
        {
          path: `${basePath}/LICENSE.txt`,
          content: LICENSE_TXT,
        },
      ],
      delete: [],
    };
  }
}
