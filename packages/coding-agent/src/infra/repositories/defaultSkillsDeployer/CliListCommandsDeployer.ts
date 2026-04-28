import { FileUpdates } from '@packmind/types';
import { ISkillDeployer } from './IDefaultSkillDeployer';
import { LICENSE_TXT } from './license';
import { skillMd } from './skills/packmind-cli-list-commands/skill.md';
import { AbstractDefaultSkillDeployer } from './AbstractDefaultSkillDeployer';

export class CliListCommandsDeployer
  extends AbstractDefaultSkillDeployer
  implements ISkillDeployer
{
  protected override unsupportedFromVersion = null;
  public readonly slug = 'packmind-cli-list-commands';
  protected readonly minimumVersion = '0.15.0';

  deploy(agentName: string, skillsFolderPath: string): FileUpdates {
    const basePath = `${skillsFolderPath}packmind-cli-list-commands`;

    return {
      createOrUpdate: [
        {
          path: `${basePath}/SKILL.md`,
          content: this.getSkillMd(agentName, skillMd),
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
