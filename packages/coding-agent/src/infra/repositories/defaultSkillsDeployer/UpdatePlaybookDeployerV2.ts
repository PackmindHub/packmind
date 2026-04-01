import { DeleteItemType, FileUpdates } from '@packmind/types';
import { ISkillDeployer } from './IDefaultSkillDeployer';
import { LICENSE_TXT } from './license';
import { AGENT_SKILLS_SPECIFICATION } from './skills/packmind-update-playbook/references/agent-skills-specification';
import { AbstractDefaultSkillDeployer } from './AbstractDefaultSkillDeployer';
import { ANALYZE_STANDARDS } from './skills/packmind-update-playbook/steps/analyze-standards';
import { ANALYZE_COMMANDS } from './skills/packmind-update-playbook/steps/analyze-commands';
import { ANALYZE_SKILLS } from './skills/packmind-update-playbook/steps/analyze-skills';
import { skillMd } from './skills/packmind-update-playbook/skill.md';
import { APPLY_CHANGES_0210 } from './skills/packmind-update-playbook/packmind-versions/0.21.0/apply-changes';
import { APPLY_CHANGES_0230 } from './skills/packmind-update-playbook/packmind-versions/0.23.0/apply-changes';
import { APPLY_CHANGES_0240 } from './skills/packmind-update-playbook/packmind-versions/0.24.0/apply-changes';

export class UpdatePlaybookDeployerV2
  extends AbstractDefaultSkillDeployer
  implements ISkillDeployer
{
  public readonly slug = 'packmind-update-playbook-v2';
  protected readonly minimumVersion = '0.23.0';
  protected override maximumVersion = null;

  deploy(agentName: string, skillsFolderPath: string): FileUpdates {
    const basePath = `${skillsFolderPath}${this.slug}`;

    return {
      createOrUpdate: [
        {
          path: `${basePath}/SKILL.md`,
          content: this.getSkillMd(agentName, skillMd),
        },
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
          path: `${basePath}/packmind-versions/0.21.0/apply-changes.md`,
          content: APPLY_CHANGES_0210,
        },
        {
          path: `${basePath}/packmind-versions/0.23.0/apply-changes.md`,
          content: APPLY_CHANGES_0230,
        },
        {
          path: `${basePath}/packmind-versions/0.24.0/apply-changes.md`,
          content: APPLY_CHANGES_0240,
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
        {
          path: `${basePath}/steps/apply-changes.md`,
          type: DeleteItemType.File,
        },
      ],
    };
  }
}
