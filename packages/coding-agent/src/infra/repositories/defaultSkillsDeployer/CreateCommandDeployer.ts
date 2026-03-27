import { FileUpdates } from '@packmind/types';
import { ISkillDeployer } from './IDefaultSkillDeployer';
import { LICENSE_TXT } from './license';
import { getSkillMd } from './skills/packmind-create-command/skill';
import { README } from './skills/packmind-create-command/readme';
import { AbstractDefaultSkillDeployer } from './AbstractDefaultSkillDeployer';

export class CreateCommandDeployer
  extends AbstractDefaultSkillDeployer
  implements ISkillDeployer
{
  public readonly slug = 'packmind-create-command';
  protected readonly minimumVersion = '0.15.0';

  deploy(agentName: string, skillsFolderPath: string): FileUpdates {
    const basePath = `${skillsFolderPath}packmind-create-command`;

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
