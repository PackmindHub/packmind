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
Action skill. Provides **complete automated onboarding** for Packmind:
1. Creates or selects a package
2. Analyzes codebase for patterns
3. Generates draft Standards and Commands
4. Creates items via CLI

Automatic package creation when none exist, user selection when packages are available.

## Guarantees

- **Read-only analysis.** Analysis phase does not modify any project files.
- **Drafts before creation.** All items are written as drafts first, allowing review before creation.
- **Preserve existing.** Never overwrite existing artifacts. If a slug already exists, create \`-2\`, \`-3\`, etc.
- **Evidence required.** Every reported insight must include file-path evidence (and line ranges when feasible).
- **Focused output.** Max **5 Standards** and **5 Commands** generated per run.
- **Graceful failure.** Partial failures don't lose successful work; failed drafts are preserved.
- **User control.** When packages exist, users confirm package selection before creation.

## Definitions

- **Pattern (non-linter):** a convention a linter cannot reliably enforce (module boundaries, cross-domain communication, workflow parity, error semantics, etc).
- **Evidence:** \`path[:line-line]\` entries; omit line ranges only when the file isn't text-searchable.

---

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
