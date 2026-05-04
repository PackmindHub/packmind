import { FileUpdates } from '@packmind/types';
import { ISkillDeployer } from './IDefaultSkillDeployer';
import { LICENSE_TXT } from './license';
import { skillMd } from './skills/packmind-create-package/skill.md';
import { README } from './skills/packmind-create-package/readme';
import {
  AbstractDefaultSkillDeployer,
  SemVer,
} from './AbstractDefaultSkillDeployer';

export class CreatePackageDeployer
  extends AbstractDefaultSkillDeployer
  implements ISkillDeployer
{
  public readonly slug = 'packmind-create-package';
  protected readonly minimumVersion = '0.15.0';
  protected override unsupportedFromVersion: SemVer = '0.27.0';

  deploy(agentName: string, skillsFolderPath: string): FileUpdates {
    const basePath = `${skillsFolderPath}packmind-create-package`;

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
