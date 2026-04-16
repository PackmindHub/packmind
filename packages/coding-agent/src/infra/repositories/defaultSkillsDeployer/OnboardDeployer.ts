import { DeleteItemType, FileUpdates } from '@packmind/types';
import { ISkillDeployer, SkillDeployOptions } from './IDefaultSkillDeployer';
import { LICENSE_TXT } from './license';
import { skillMd } from './skills/packmind-onboard/skill.md';
import { README } from './skills/packmind-onboard/readme';
import { TEST_DATA_CONSTRUCTION } from './skills/packmind-onboard/references/test-data-construction';
import { FILE_TEMPLATE_CONSISTENCY } from './skills/packmind-onboard/references/file-template-consistency';
import { CI_LOCAL_WORKFLOW_PARITY } from './skills/packmind-onboard/references/ci-local-workflow-parity';
import { ROLE_TAXONOMY_DRIFT } from './skills/packmind-onboard/references/role-taxonomy-drift';
import { STEP_0_INTRODUCTION } from './skills/packmind-onboard/steps/step-0-introduction';
import { STEP_1_GET_REPOSITORY_NAME } from './skills/packmind-onboard/steps/step-1-get-repository-name';
import { STEP_2_PACKAGE_HANDLING } from './skills/packmind-onboard/steps/step-2-package-handling';
import { STEP_3_ANNOUNCE } from './skills/packmind-onboard/steps/step-3-announce';
import { STEP_4_DETECT_EXISTING_CONFIG } from './skills/packmind-onboard/steps/step-4-detect-existing-config';
import { STEP_5_DETECT_PROJECT_STACK } from './skills/packmind-onboard/steps/step-5-detect-project-stack';
import { STEP_6_RUN_ANALYSES } from './skills/packmind-onboard/steps/step-6-run-analyses';
import { STEP_7_GENERATE_DRAFTS } from './skills/packmind-onboard/steps/step-7-generate-drafts';
import { STEP_8_PRESENT_SUMMARY } from './skills/packmind-onboard/steps/step-8-present-summary';
import { STEP_9_CREATE_ITEMS } from './skills/packmind-onboard/steps/step-9-create-items';
import { STEP_10_COMPLETION_SUMMARY } from './skills/packmind-onboard/steps/step-10-completion-summary';
import { EDGE_CASES } from './skills/packmind-onboard/steps/edge-cases';
import { CREATE_ITEMS_0160 } from './skills/packmind-onboard/packmind-versions/0.16.0/create-items';
import { CREATE_PACKAGE_0160 } from './skills/packmind-onboard/packmind-versions/0.16.0/create-package';
import { LIST_PACKAGES_0160 } from './skills/packmind-onboard/packmind-versions/0.16.0/list-packages';
import { SELECT_PACKAGE_0160 } from './skills/packmind-onboard/packmind-versions/0.16.0/select-package';
import { CREATE_ITEMS_0230 } from './skills/packmind-onboard/packmind-versions/0.23.0/create-items';
import { CREATE_PACKAGE_0230 } from './skills/packmind-onboard/packmind-versions/0.23.0/create-package';
import { LIST_PACKAGES_0230 } from './skills/packmind-onboard/packmind-versions/0.23.0/list-packages';
import { SELECT_PACKAGE_0230 } from './skills/packmind-onboard/packmind-versions/0.23.0/select-package';
import { COMPLETION_SUMMARY_0160 } from './skills/packmind-onboard/packmind-versions/0.16.0/completion-summary';
import { COMPLETION_SUMMARY_0230 } from './skills/packmind-onboard/packmind-versions/0.23.0/completion-summary';
import {
  AbstractDefaultSkillDeployer,
  SemVer,
} from './AbstractDefaultSkillDeployer';

const createItemsByVersion: Record<SemVer, string> = {
  '0.16.0': CREATE_ITEMS_0160,
  '0.23.0': CREATE_ITEMS_0230,
};

const listPackagesByVersion: Record<SemVer, string> = {
  '0.16.0': LIST_PACKAGES_0160,
  '0.23.0': LIST_PACKAGES_0230,
};

const createPackageByVersion: Record<SemVer, string> = {
  '0.16.0': CREATE_PACKAGE_0160,
  '0.23.0': CREATE_PACKAGE_0230,
};

const selectPackageByVersion: Record<SemVer, string> = {
  '0.16.0': SELECT_PACKAGE_0160,
  '0.23.0': SELECT_PACKAGE_0230,
};

const completionSummaryByVersion: Record<SemVer, string> = {
  '0.16.0': COMPLETION_SUMMARY_0160,
  '0.23.0': COMPLETION_SUMMARY_0230,
};

export class OnboardDeployer
  extends AbstractDefaultSkillDeployer
  implements ISkillDeployer
{
  public readonly slug = 'packmind-onboard';
  protected readonly minimumVersion = '0.16.0';
  protected override unsupportedFromVersion = null;

  deploy(
    agentName: string,
    skillsFolderPath: string,
    options?: SkillDeployOptions,
  ): FileUpdates {
    const basePath = `${skillsFolderPath}packmind-onboard`;
    const referencesPath = `${basePath}/references`;
    const stepsPath = `${basePath}/steps`;
    const includeNext = options?.includeNext ?? false;

    const createOrUpdate = [
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
      // Step files
      {
        path: `${stepsPath}/step-0-introduction.md`,
        content: STEP_0_INTRODUCTION,
      },
      {
        path: `${stepsPath}/step-1-get-repository-name.md`,
        content: STEP_1_GET_REPOSITORY_NAME,
      },
      {
        path: `${stepsPath}/step-2-package-handling.md`,
        content: STEP_2_PACKAGE_HANDLING,
      },
      {
        path: `${stepsPath}/step-3-announce.md`,
        content: STEP_3_ANNOUNCE,
      },
      {
        path: `${stepsPath}/step-4-detect-existing-config.md`,
        content: STEP_4_DETECT_EXISTING_CONFIG,
      },
      {
        path: `${stepsPath}/step-5-detect-project-stack.md`,
        content: STEP_5_DETECT_PROJECT_STACK,
      },
      {
        path: `${stepsPath}/step-6-run-analyses.md`,
        content: STEP_6_RUN_ANALYSES,
      },
      {
        path: `${stepsPath}/step-7-generate-drafts.md`,
        content: STEP_7_GENERATE_DRAFTS,
      },
      {
        path: `${stepsPath}/step-8-present-summary.md`,
        content: STEP_8_PRESENT_SUMMARY,
      },
      {
        path: `${stepsPath}/step-9-create-items.md`,
        content: STEP_9_CREATE_ITEMS,
      },
      {
        path: `${stepsPath}/step-10-completion-summary.md`,
        content: STEP_10_COMPLETION_SUMMARY,
      },
      {
        path: `${stepsPath}/edge-cases.md`,
        content: EDGE_CASES,
      },
      // Versioned files
      ...skillMd.versions.map((version) => ({
        path: `${basePath}/packmind-versions/${version}/create-items.md`,
        content: createItemsByVersion[version],
      })),
      ...skillMd.versions.map((version) => ({
        path: `${basePath}/packmind-versions/${version}/list-packages.md`,
        content: listPackagesByVersion[version],
      })),
      ...skillMd.versions.map((version) => ({
        path: `${basePath}/packmind-versions/${version}/create-package.md`,
        content: createPackageByVersion[version],
      })),
      ...skillMd.versions.map((version) => ({
        path: `${basePath}/packmind-versions/${version}/select-package.md`,
        content: selectPackageByVersion[version],
      })),
      ...skillMd.versions.map((version) => ({
        path: `${basePath}/packmind-versions/${version}/completion-summary.md`,
        content: completionSummaryByVersion[version],
      })),
    ];

    const deleteItems = [];

    if (includeNext) {
      const latestVersion = skillMd.versions[skillMd.versions.length - 1];
      createOrUpdate.push({
        path: `${basePath}/packmind-versions/next/create-items.md`,
        content: createItemsByVersion[latestVersion],
      });
      createOrUpdate.push({
        path: `${basePath}/packmind-versions/next/list-packages.md`,
        content: listPackagesByVersion[latestVersion],
      });
      createOrUpdate.push({
        path: `${basePath}/packmind-versions/next/create-package.md`,
        content: createPackageByVersion[latestVersion],
      });
      createOrUpdate.push({
        path: `${basePath}/packmind-versions/next/select-package.md`,
        content: selectPackageByVersion[latestVersion],
      });
      createOrUpdate.push({
        path: `${basePath}/packmind-versions/next/completion-summary.md`,
        content: completionSummaryByVersion[latestVersion],
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
