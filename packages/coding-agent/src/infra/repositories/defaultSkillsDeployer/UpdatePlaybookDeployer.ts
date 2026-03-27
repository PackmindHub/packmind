import { DeleteItemType, FileUpdates } from '@packmind/types';
import { ISkillDeployer } from './IDefaultSkillDeployer';
import { LICENSE_TXT } from './license';
import { getSkillMd } from './skills/packmind-update-playbook/skill';
import { AGENT_SKILLS_SPECIFICATION } from './skills/packmind-update-playbook/references/agent-skills-specification';
import { AbstractDefaultSkillDeployer } from './AbstractDefaultSkillDeployer';
import { ANALYZE_STANDARDS } from './skills/packmind-update-playbook/steps/analyze-standards';
import { ANALYZE_COMMANDS } from './skills/packmind-update-playbook/steps/analyze-commands';
import { ANALYZE_SKILLS } from './skills/packmind-update-playbook/steps/analyze-skills';
import { APPLY_CHANGES } from './skills/packmind-update-playbook/steps/apply-changes';

export class UpdatePlaybookDeployer
  extends AbstractDefaultSkillDeployer
  implements ISkillDeployer
{  public readonly slug = 'packmind-update-playbook';
  protected readonly minimumVersion = '0.21.0';

  deploy(_agentName: string, skillsFolderPath: string): FileUpdates {
    const basePath = `${skillsFolderPath}packmind-update-playbook`;

    return {
      createOrUpdate: [
        { path: `${basePath}/SKILL.md`, content: getSkillMd() },
        { path: `${basePath}/LICENSE.txt`, content: LICENSE_TXT },
        {
          path: `${basePath}/steps/analyze-standards.md`,
          content: ANALYZE_STANDARDS,
        },
        {
          path: `${basePath}/steps/analyze-commands.md`,
          content: ANALYZE_COMMANDS,
        },
        {
          path: `${basePath}/steps/analyze-skills.md`,
          content: ANALYZE_SKILLS,
        },
        {
          path: `${basePath}/steps/apply-changes.md`,
          content: APPLY_CHANGES,
        },
        {
          path: `${basePath}/references/agent-skills-specification.md`,
          content: AGENT_SKILLS_SPECIFICATION,
        },
      ],
      delete: [
        {
          path: `${basePath}/references/domain-standards.md`,
          type: DeleteItemType.File,
        },
        {
          path: `${basePath}/references/domain-commands.md`,
          type: DeleteItemType.File,
        },
        {
          path: `${basePath}/references/domain-skills.md`,
          type: DeleteItemType.File,
        },
      ],
    };
  }
}
