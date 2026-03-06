import { FileUpdates } from '@packmind/types';
import { ISkillDeployer } from './IDefaultSkillDeployer';
import { LICENSE_TXT } from './license';
import { getSkillMd } from './skills/packmind-create-skill/skill';
import { README } from './skills/packmind-create-skill/readme';
import { getInitSkillPy } from './skills/packmind-create-skill/scripts/init-skill';
import { QUICK_VALIDATE_PY } from './skills/packmind-create-skill/scripts/quick-validate';

export class CreateSkillDeployer implements ISkillDeployer {
  public readonly slug = 'packmind-create-skill';
  public readonly minimumVersion = '0.14.0';

  deploy(agentName: string, skillsFolderPath: string): FileUpdates {
    const basePath = `${skillsFolderPath}packmind-create-skill`;

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
        {
          path: `${basePath}/scripts/init_skill.py`,
          content: getInitSkillPy(agentName),
        },
        {
          path: `${basePath}/scripts/quick_validate.py`,
          content: QUICK_VALIDATE_PY,
        },
      ],
      delete: [],
    };
  }
}
