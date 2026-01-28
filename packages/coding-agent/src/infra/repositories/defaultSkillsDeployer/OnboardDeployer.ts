import { FileUpdates } from '@packmind/types';
import { ISkillDeployer } from './IDefaultSkillDeployer';

function getOnboardSkillMd(): string {
  return `---
name: 'packmind-onboard'
description: "Analyze any codebase to discover insights, generate personalized Standards and Commands"
license: 'Complete terms in LICENSE.txt'
---

# packmind-onboard

Action skill. Analyzes your codebase to discover things you didn't know, then generates personalized Standards and Commands.

**Works with any language.** The analysis adapts to what your codebase actually uses.

**Draft-first:** nothing is written or sent unless you explicitly choose it.

## What This Skill Produces

- **Insights** - Non-obvious discoveries about YOUR codebase
- **Standards** - Rules derived from insights, tailored to your conventions
- **Commands** - Workflows derived from insights, matching your project structure

## Execution

### Step 1: Announce

Print:
\`\`\`
packmind-onboard: analyzing codebase (read-only)...
\`\`\`

### Step 2: Detect Project Stack

Before analyzing, understand what you're working with. Use Glob and Read to check:

**Language markers:**
- \`package.json\` -> JavaScript/TypeScript
- \`pyproject.toml\`, \`requirements.txt\`, \`setup.py\` -> Python
- \`go.mod\` -> Go
- \`Cargo.toml\` -> Rust
- \`Gemfile\` -> Ruby
- \`pom.xml\`, \`build.gradle\` -> Java/Kotlin
- \`*.csproj\`, \`*.sln\` -> C#/.NET
- \`composer.json\` -> PHP

**Config files:**
- Linters: \`.eslintrc*\`, \`pylintrc\`, \`.rubocop.yml\`, \`golangci.yml\`, \`.flake8\`
- Formatters: \`.prettierrc*\`, \`pyproject.toml [tool.black]\`, \`.rustfmt.toml\`
- Type checkers: \`tsconfig.json\`, \`mypy.ini\`, \`pyrightconfig.json\`

**CI:**
- \`.github/workflows/*.yml\`
- \`.gitlab-ci.yml\`
- \`Jenkinsfile\`
- \`.circleci/config.yml\`

Note what you find - this guides which analyses are relevant.

### Step 3: Run Analyses

Run each analysis that applies to the detected stack. Use Read, Grep, and Glob tools.

---

#### Analysis A: Config vs Reality Gaps

**Goal:** Find configs that exist but aren't enforced in code.

For each config file found, grep for bypass patterns:

| Config found | Grep for violations |
|--------------|---------------------|
| \`tsconfig.json\` with strict | \`@ts-ignore\`, \`@ts-expect-error\`, \`: any\` |
| \`.eslintrc*\` or \`eslint.config.*\` | \`eslint-disable\`, \`eslint-disable-line\` |
| \`mypy.ini\` or \`pyproject.toml [tool.mypy]\` | \`# type: ignore\` |
| \`.flake8\` or \`setup.cfg [flake8]\` | \`# noqa\` |
| \`golangci.yml\` | \`//nolint\` |
| \`.rubocop.yml\` | \`# rubocop:disable\` |

**Steps:**
1. Read the config file to confirm it exists and is active
2. Use Grep to find violations in source files (exclude node_modules, vendor, etc.)
3. Count total violations
4. Note top 5 file paths as evidence

**Report if:** config exists AND violations > 0

**Insight format:**
\`\`\`
CONFIG GAP: [Config] is configured but [N] bypass comments found
Evidence: [file1], [file2], ...
Severity: high (>20) | medium (5-20) | low (<5)
\`\`\`

---

#### Analysis B: Naming Convention Patterns

**Goal:** Discover what naming patterns exist and find inconsistencies.

**Steps:**
1. Use Glob to find files matching common patterns:
   \`\`\`
   **/*[Cc]ontroller*    **/*[Ss]ervice*     **/*[Rr]epository*
   **/*[Hh]andler*       **/*[Mm]odel*       **/*[Uu]se[Cc]ase*
   \`\`\`

2. For patterns with 3+ matches, analyze:
   - What suffix/naming is dominant? (e.g., \`.service.ts\` vs \`_service.py\`)
   - Are there files that should match but don't?
   - Calculate consistency percentage

3. Check file casing in source directories:
   - Count: kebab-case, snake_case, camelCase, PascalCase
   - Find dominant pattern and exceptions

**Report if:** pattern exists with exceptions (consistency < 100%)

**Insight format:**
\`\`\`
NAMING PATTERN: [N] files use [pattern], but [M] exceptions found
Dominant: [examples]
Exceptions: [examples]
Consistency: [X]%
\`\`\`

---

#### Analysis C: Test Structure Patterns

**Goal:** Discover how tests are written, find inconsistencies.

**Steps:**
1. Find test files (adapt to detected language):
   - JS/TS: \`**/*.spec.ts\`, \`**/*.test.ts\`
   - Python: \`**/test_*.py\`, \`**/*_test.py\`
   - Go: \`**/*_test.go\`
   - Ruby: \`**/*_spec.rb\`
   - Java: \`**/*Test.java\`

2. Read 5-10 test files

3. Detect patterns (language-appropriate):

   **JS/TS:** factory functions, nested describes, beforeEach, mocking
   **Python:** fixtures, parametrize, factory pattern
   **Go:** table-driven tests, subtests
   **Ruby:** FactoryBot, contexts, let blocks

4. Calculate frequency of each pattern
5. Find files that don't follow dominant patterns

**Report if:** pattern frequency is 40-90% (interesting variation)

**Insight format:**
\`\`\`
TEST PATTERN: [X]% of tests use [pattern], [Y]% don't
Using it: [files]
Not using it: [files]
\`\`\`

---

#### Analysis D: CI vs Local Workflow Gaps

**Goal:** Find CI commands that can't be run locally.

**Steps:**
1. Read project manifest for local scripts:
   - \`package.json\` -> scripts
   - \`pyproject.toml\` -> scripts
   - \`Makefile\` -> targets
   - \`Taskfile.yml\` -> tasks

2. Read CI configuration and extract commands:
   - \`.github/workflows/*.yml\` -> \`run:\` commands
   - \`.gitlab-ci.yml\` -> \`script:\` commands

3. Compare: which CI commands have no local equivalent?

**Report if:** at least 1 CI command has no local equivalent

**Insight format:**
\`\`\`
WORKFLOW GAP: CI runs [N] commands not available locally
CI: [list]
Local: [list]
Missing: [list]
\`\`\`

---

#### Analysis E: File Creation Patterns

**Goal:** Find boilerplate patterns to generate creation commands.

**Steps:**
1. Identify file types with 3+ instances (Controllers, Services, UseCases, etc.)

2. Read 3-5 sample files of each type

3. Extract common elements:
   - Base class/interface
   - Decorators/annotations
   - Common imports
   - Constructor dependencies
   - Common methods

4. Extract variable elements (name, specific logic)

**Report if:** clear common structure found

**Insight format:**
\`\`\`
FILE PATTERN: All [N] [FileType] files share common structure
Common: [base class], [decorators], [methods]
Variable: [name], [specific logic]
Evidence: [sample files]
\`\`\`

---

### Step 4: Generate Artifacts

Based on insights, generate Standards and Commands.

#### From CONFIG GAP -> Standard

\`\`\`yaml
name: "[Config] Enforcement"
summary: "Enforce [config] by eliminating bypass patterns"
description: "Discovered: [N] violations found"
rules:
  - content: "Avoid [bypass pattern] - address the underlying issue"
    examples:
      positive: "[proper fix]"
      negative: "[bypass from codebase]"
\`\`\`

#### From NAMING PATTERN -> Standard

\`\`\`yaml
name: "Naming Conventions"
summary: "Consistent naming based on codebase patterns"
description: "[X]% follow this pattern"
rules:
  - content: "Name [file type] using [detected pattern]"
    examples:
      positive: "[dominant example]"
      negative: "[exception example]"
\`\`\`

#### From TEST PATTERN -> Standard

\`\`\`yaml
name: "Test Structure"
summary: "Consistent test patterns"
rules:
  - content: "[pattern description]"
    examples:
      positive: "[file that follows]"
      negative: "[file that doesn't]"
\`\`\`

#### From WORKFLOW GAP -> Command

\`\`\`yaml
name: "Pre-Commit Check"
summary: "Run CI checks locally"
whenToUse:
  - "Before pushing changes"
steps:
  - name: "[Step]"
    description: "[What it does]"
    codeSnippet: "[command]"
\`\`\`

#### From FILE PATTERN -> Command

\`\`\`yaml
name: "Create [FileType]"
summary: "Create new [FileType] following conventions"
contextValidationCheckpoints:
  - "What is the name?"
  - "What module does it belong to?"
steps:
  - name: "Create file"
    codeSnippet: |
      [template with common structure]
  - name: "Create test"
  - name: "Register/Export"
\`\`\`

---

### Step 5: Present Results

\`\`\`
============================================================
  PACKMIND ONBOARDING RESULTS
============================================================

Stack: [detected language/framework/tools]

INSIGHTS:

  1. [Title]
     evidence: [files]

  2. [Title]
     evidence: [files]

  3. [Title]
     evidence: [files]

ARTIFACTS:

  Standards ([N]):
    * [Name] ([M] rules)

  Commands ([N]):
    * [Name] ([M] steps)

============================================================

[a] Apply to repo | [p] Preview artifact | [q] Quit
\`\`\`

### Step 6: Handle Choice

**[a] Apply:**
- Create \`.packmind/standards/[name].yaml\` for each Standard
- Create \`.packmind/commands/[name].yaml\` for each Command
- Show what was written
- Done

**[p] Preview:**
- Show full YAML for selected artifact
- Return to menu

**[q] Quit:**
- Print: "Done. Run this skill again anytime."

---

## Rules

- **Language agnostic.** Detect what exists, don't assume.
- **Evidence required.** Every insight needs file paths.
- **Skip irrelevant.** No Python analysis in a Go project.
- **Wow factor.** Report surprises, not obvious facts.
- **Draft-first.** Only write with explicit user choice.

## Quality Check

Before reporting an insight, verify:
- It applies to THIS codebase's detected stack
- It reveals something non-obvious
- It has file path evidence
- It maps to an actionable artifact

**Bad:** "Project uses TypeScript" (obvious)
**Good:** "TypeScript strict enabled but 47 @ts-ignore found" (surprising)

## No Insights Found

If no insights discovered:
\`\`\`
Analysis complete. No significant insights found.

Your codebase appears consistent! Possible reasons:
- Configs are well-enforced
- Naming is consistent
- Tests follow uniform patterns
- CI matches local scripts

This is a good thing!
\`\`\`
`;
}

const ONBOARD_README = `# Packmind Onboarding Skill

Action skill that analyzes your codebase to discover insights and generate personalized Standards and Commands.

## What It Does

1. **Detects your stack** - Language, frameworks, configs, CI
2. **Analyzes for insights** - Config gaps, naming patterns, test patterns, workflow gaps, file patterns
3. **Generates artifacts** - Standards with rules, Commands with steps
4. **Applies on your choice** - Nothing written without explicit confirmation

**Works with any language** - JavaScript, TypeScript, Python, Go, Ruby, Java, and more.

## Usage

Ask your AI agent to onboard:
- "Onboard this project to Packmind"
- "Analyze this codebase for standards"
- "Generate coding standards for this project"

## What You'll Discover

- **Config gaps**: "ESLint configured but 47 eslint-disable comments found"
- **Naming inconsistencies**: "94% use .service.ts suffix, 3 files don't"
- **Test pattern drift**: "80% of tests use factories, 20% use inline objects"
- **Workflow gaps**: "CI runs typecheck, no local script exists"
- **File patterns**: "All UseCases share AbstractUseCase base class"

## License

Apache 2.0 - See LICENSE.txt for details.
`;

const ONBOARD_LICENSE = `
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS
`;

export class OnboardDeployer implements ISkillDeployer {
  deploy(_agentName: string, skillsFolderPath: string): FileUpdates {
    const basePath = `${skillsFolderPath}packmind-onboard`;

    return {
      createOrUpdate: [
        {
          path: `${basePath}/SKILL.md`,
          content: getOnboardSkillMd(),
        },
        {
          path: `${basePath}/README.md`,
          content: ONBOARD_README,
        },
        {
          path: `${basePath}/LICENSE.txt`,
          content: ONBOARD_LICENSE,
        },
      ],
      delete: [],
    };
  }
}
