import { FileUpdates } from '@packmind/types';
import { ISkillDeployer } from './IDefaultSkillDeployer';
import { LICENSE_TXT } from './license';
import { getSkillMd } from './skills/packmind-create-standard/skill';
import { README } from './skills/packmind-create-standard/readme';

export class CreateStandardDeployer implements ISkillDeployer {
  public readonly slug = 'packmind-create-standard';
  public readonly minimumVersion = '0.14.0';

  deploy(agentName: string, skillsFolderPath: string): FileUpdates {
    const basePath = `${skillsFolderPath}packmind-create-standard`;

    return {
      createOrUpdate: [
        {
          path: `${basePath}/SKILL.md`,
          content: getSkillMd(agentName),
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
