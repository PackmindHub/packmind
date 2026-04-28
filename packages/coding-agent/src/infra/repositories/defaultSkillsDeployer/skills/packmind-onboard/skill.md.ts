import { SkillMD } from '../../AbstractDefaultSkillDeployer';
import { STEP_0_INTRODUCTION } from './steps/step-0-introduction';
import { STEP_1_GET_REPOSITORY_NAME } from './steps/step-1-get-repository-name';
import { STEP_2_PACKAGE_HANDLING } from './steps/step-2-package-handling';
import { STEP_3_ANNOUNCE } from './steps/step-3-announce';
import { STEP_4_DETECT_EXISTING_CONFIG } from './steps/step-4-detect-existing-config';
import { STEP_5_DETECT_PROJECT_STACK } from './steps/step-5-detect-project-stack';
import { STEP_6_RUN_ANALYSES } from './steps/step-6-run-analyses';
import { STEP_7_GENERATE_DRAFTS } from './steps/step-7-generate-drafts';
import { STEP_8_PRESENT_SUMMARY } from './steps/step-8-present-summary';
import { STEP_9_CREATE_ITEMS } from './steps/step-9-create-items';
import { STEP_10_COMPLETION_SUMMARY } from './steps/step-10-completion-summary';
import { EDGE_CASES } from './steps/edge-cases';

export const skillMd: SkillMD = {
  frontMatter: {
    description:
      'Complete automated onboarding: analyzes codebase, creates package, and generates standards & commands via CLI. Automatic package creation when none exist, user selection when packages are available.',
    license: 'Complete terms in LICENSE.txt',
  },
  title: 'packmind-onboard',
  versions: ['0.16.0', '0.23.0'],
  getPrompt: function (): string {
    return `
${STEP_0_INTRODUCTION}

---

${STEP_1_GET_REPOSITORY_NAME}

---

${STEP_2_PACKAGE_HANDLING}

---

${STEP_3_ANNOUNCE}

---

${STEP_4_DETECT_EXISTING_CONFIG}

---

${STEP_5_DETECT_PROJECT_STACK}

---

${STEP_6_RUN_ANALYSES}

---

${STEP_7_GENERATE_DRAFTS}

---

${STEP_8_PRESENT_SUMMARY}

---

${STEP_9_CREATE_ITEMS}

---

${STEP_10_COMPLETION_SUMMARY}

---

${EDGE_CASES}
`;
  },
};
