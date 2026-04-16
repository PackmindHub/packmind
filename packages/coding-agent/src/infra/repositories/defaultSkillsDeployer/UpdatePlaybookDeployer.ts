import { DeleteItemType, FileUpdates } from '@packmind/types';
import { ISkillDeployer, SkillDeployOptions } from './IDefaultSkillDeployer';
import { LICENSE_TXT } from './license';
import { skillMd } from './skills/packmind-update-playbook/skill.md';
import { AGENT_SKILLS_SPECIFICATION } from './skills/packmind-update-playbook/references/agent-skills-specification';
import {
  AbstractDefaultSkillDeployer,
  SemVer,
} from './AbstractDefaultSkillDeployer';
import { ANALYZE_STANDARDS } from './skills/packmind-update-playbook/steps/analyze-standards';
import { ANALYZE_COMMANDS } from './skills/packmind-update-playbook/steps/analyze-commands';
import { ANALYZE_SKILLS } from './skills/packmind-update-playbook/steps/analyze-skills';
import { APPLY_CHANGES_0210 } from './skills/packmind-update-playbook/packmind-versions/0.21.0/apply-changes';
import { APPLY_CHANGES_0230 } from './skills/packmind-update-playbook/packmind-versions/0.23.0/apply-changes';
import { CREATE_STANDARD_PROCEDURE } from './skills/packmind-update-playbook/references/create-standard-procedure';
import { CREATE_COMMAND_PROCEDURE } from './skills/packmind-update-playbook/references/create-command-procedure';
import { CREATE_SKILL_PROCEDURE } from './skills/packmind-update-playbook/references/create-skill-procedure';

const applyChangesByVersion: Record<SemVer, string> = {
  '0.21.0': APPLY_CHANGES_0210,
  '0.23.0': APPLY_CHANGES_0230,
};

export class UpdatePlaybookDeployer
  extends AbstractDefaultSkillDeployer
  implements ISkillDeployer
{
  public readonly slug = 'packmind-update-playbook';
  protected readonly minimumVersion = '0.21.0';
  protected override unsupportedFromVersion = null;

  deploy(
    agentName: string,
    skillsFolderPath: string,
    options?: SkillDeployOptions,
  ): FileUpdates {
    const basePath = `${skillsFolderPath}${this.slug}`;
    const includeNext = options?.includeNext ?? false;

    const createOrUpdate = [
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
      ...skillMd.versions.map((version) => ({
        path: `${basePath}/packmind-versions/${version}/apply-changes.md`,
        content: applyChangesByVersion[version],
      })),
      {
        path: `${basePath}/references/agent-skills-specification.md`,
        content: AGENT_SKILLS_SPECIFICATION,
      },
      {
        path: `${basePath}/references/create-standard-procedure.md`,
        content: CREATE_STANDARD_PROCEDURE,
      },
      {
        path: `${basePath}/references/create-command-procedure.md`,
        content: CREATE_COMMAND_PROCEDURE,
      },
      {
        path: `${basePath}/references/create-skill-procedure.md`,
        content: CREATE_SKILL_PROCEDURE,
      },
    ];

    const deleteItems = [
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
    ];

    if (includeNext) {
      const latestVersion = skillMd.versions[skillMd.versions.length - 1];
      createOrUpdate.push({
        path: `${basePath}/packmind-versions/next/apply-changes.md`,
        content: applyChangesByVersion[latestVersion],
      });
    } else {
      deleteItems.push({
        path: `${basePath}/packmind-versions/next`,
        type: DeleteItemType.Directory,
      });
    }

    return { createOrUpdate, delete: deleteItems };
  }
}
