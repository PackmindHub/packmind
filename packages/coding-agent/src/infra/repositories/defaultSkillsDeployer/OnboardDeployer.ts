import { FileUpdates } from '@packmind/types';
import { ISkillDeployer } from './IDefaultSkillDeployer';
import { LICENSE_TXT } from './license';
import { skillMd } from './skills/packmind-onboard/skill.md';
import { README } from './skills/packmind-onboard/readme';
import { TEST_DATA_CONSTRUCTION } from './skills/packmind-onboard/references/test-data-construction';
import { FILE_TEMPLATE_CONSISTENCY } from './skills/packmind-onboard/references/file-template-consistency';
import { CI_LOCAL_WORKFLOW_PARITY } from './skills/packmind-onboard/references/ci-local-workflow-parity';
import { ROLE_TAXONOMY_DRIFT } from './skills/packmind-onboard/references/role-taxonomy-drift';
import { AbstractDefaultSkillDeployer } from './AbstractDefaultSkillDeployer';

export class OnboardDeployer
  extends AbstractDefaultSkillDeployer
  implements ISkillDeployer
{
  public readonly slug = 'packmind-onboard';
  protected readonly minimumVersion = '0.16.0';
  protected override unsupportedFromVersion = null;

  deploy(agentName: string, skillsFolderPath: string): FileUpdates {
    const basePath = `${skillsFolderPath}packmind-onboard`;
    const referencesPath = `${basePath}/references`;

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
        // Reference files
        {
          path: `${referencesPath}/file-template-consistency.md`,
          content: FILE_TEMPLATE_CONSISTENCY,
        },
        {
          path: `${referencesPath}/ci-local-workflow-parity.md`,
          content: CI_LOCAL_WORKFLOW_PARITY,
        },
        {
          path: `${referencesPath}/role-taxonomy-drift.md`,
          content: ROLE_TAXONOMY_DRIFT,
        },
        {
          path: `${referencesPath}/test-data-construction.md`,
          content: TEST_DATA_CONSTRUCTION,
        },
      ],
      delete: [],
    };
  }
}
