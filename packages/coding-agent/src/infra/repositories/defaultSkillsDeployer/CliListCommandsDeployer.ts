import { FileUpdates } from '@packmind/types';
import { ISkillDeployer } from './IDefaultSkillDeployer';
import { LICENSE_TXT } from './license';
import { skillMd } from './skills/packmind-cli-list-commands/skill.md';
import {
  AbstractDefaultSkillDeployer,
  SemVer,
} from './AbstractDefaultSkillDeployer';

export class CliListCommandsDeployer
  extends AbstractDefaultSkillDeployer
  implements ISkillDeployer
{
  protected override unsupportedFromVersion: SemVer = '0.27.0';
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
