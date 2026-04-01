import { FileUpdates } from '@packmind/types';
import { ISkillDeployer } from './IDefaultSkillDeployer';
import { LICENSE_TXT } from './license';
import { README } from './skills/packmind-create-command/readme';
import { AbstractDefaultSkillDeployer } from './AbstractDefaultSkillDeployer';
import { skillMd } from './skills/packmind-create-command/skill.md';

export class CreateCommandDeployer
  extends AbstractDefaultSkillDeployer
  implements ISkillDeployer
{
  public readonly slug = 'packmind-create-command';
  protected readonly minimumVersion = '0.15.0';
  protected override maximumVersion = '0.24.0';

  deploy(agentName: string, skillsFolderPath: string): FileUpdates {
    const basePath = `${skillsFolderPath}packmind-create-command`;

    return {
      createOrUpdate: [
        {
          path: `${basePath}/SKILL.md`,
          content: this.getSkillMd(agentName, skillMd),
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
