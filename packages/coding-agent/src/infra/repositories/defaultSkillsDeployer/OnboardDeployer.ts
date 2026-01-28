import { FileUpdates } from '@packmind/types';
import { ISkillDeployer } from './IDefaultSkillDeployer';

function getOnboardSkillMd(agentName: string): string {
  return `---
name: 'packmind-onboard'
description: "Guide for initializing Packmind in a project. This skill should be used when users want to onboard their project to Packmind, scan for patterns, and generate project-specific standards, commands, and skills for ${agentName}."
license: 'Complete terms in LICENSE.txt'
---

# Project Onboarding

This skill guides you through initializing Packmind in your project - scanning for patterns and generating project-specific standards, commands, and skills.

## What Onboarding Does

The onboarding process:

1. **Scans your project** to detect languages, frameworks, tools, and structure
2. **Reads existing documentation** from CLAUDE.md, CONTRIBUTING.md, and similar files
3. **Generates standards** based on detected technologies and extracted conventions
4. **Generates commands** for common workflows (e.g., creating modules, components)
5. **Generates skills** for debugging and navigation
6. **Writes files** to \`.packmind/\` and \`.claude/skills/\`

## Prerequisites

Before onboarding, verify that packmind-cli is available:

\`\`\`bash
packmind-cli --version
\`\`\`

If not available, install it:

\`\`\`bash
npm install -g @packmind/cli
\`\`\`

Then login to Packmind:

\`\`\`bash
packmind-cli login
\`\`\`

## Onboarding Process

### Option 1: Full Initialization (Recommended)

Run the init command to install default skills AND scan your project:

\`\`\`bash
packmind-cli init
\`\`\`

This will:
1. Install default Packmind skills (skill creator, standard creator, this onboarding skill)
2. Scan your project for technologies and patterns
3. Show a preview of generated content
4. Prompt for confirmation before writing files
5. Write generated files to your project

#### Flags

- \`--dry-run\` or \`-d\`: Preview what would be generated without writing files
- \`--yes\` or \`-y\`: Skip confirmation prompts
- \`--skip-onboard\`: Only install default skills, skip project scanning
- \`--skip-default-skills\`: Only run onboarding, skip default skills installation

### Option 2: Onboard Only

If you've already installed default skills or want to re-scan your project:

\`\`\`bash
packmind-cli onboard
\`\`\`

This scans your project and generates content without installing default skills.

#### Onboard Flags

- \`--path <dir>\` or \`-p <dir>\`: Specify a different project path to scan
- \`--dry-run\` or \`-d\`: Preview without writing files
- \`--yes\` or \`-y\`: Skip confirmation prompts

## What Gets Detected

### Languages

The scanner detects languages from configuration files:

| Language | Detection |
|----------|-----------|
| TypeScript | \`tsconfig.json\` |
| JavaScript | \`package.json\` |
| Python | \`requirements.txt\`, \`setup.py\`, \`pyproject.toml\` |
| Java | \`pom.xml\`, \`build.gradle\` |
| Go | \`go.mod\` |
| Rust | \`Cargo.toml\` |
| PHP | \`composer.json\` |
| Ruby | \`Gemfile\` |
| C# | \`*.csproj\`, \`*.sln\` |

### Frameworks

| Framework | Detection |
|-----------|-----------|
| NestJS | \`@nestjs/core\` dependency |
| React | \`react\` dependency |
| Vue | \`vue\` dependency |
| Angular | \`@angular/core\` dependency |
| Express | \`express\` dependency |
| Next.js | \`next\` dependency |
| Django | \`django\` in requirements |
| FastAPI | \`fastapi\` in requirements |
| Spring Boot | \`spring-boot\` in pom.xml |
| ASP.NET Core | \`Microsoft.AspNetCore\` reference |
| Rails | \`rails\` in Gemfile |

### Tools

| Tool | Detection |
|------|-----------|
| ESLint | \`.eslintrc.*\` files |
| Prettier | \`.prettierrc\` file |
| Nx | \`nx.json\` |
| Turbo | \`turbo.json\` |
| Jest | \`jest\` dependency or \`jest.config.*\` |
| Vitest | \`vitest\` dependency or \`vitest.config.*\` |

### Structure

- **Monorepo**: \`packages/\` or \`apps/\` directories
- **Source directory**: \`src/\` directory
- **Tests**: \`test/\`, \`tests/\`, or \`__tests__/\` directories

## Generated Content

### Standards

Based on detected technologies, generates standards like:

- **TypeScript Coding Standards** - Type safety, interfaces, naming conventions
- **NestJS Architecture Standards** - Module organization, dependency injection
- **React Component Standards** - Hooks, props, composition patterns
- **Testing Standards** - Test structure, assertions, mocking
- **Monorepo Organization Standards** - Package boundaries, dependencies

If existing documentation (CLAUDE.md, CONTRIBUTING.md) contains rules or conventions, these are extracted into an "Extracted Project Standards" standard.

### Commands

Framework-specific workflow commands:

- **Create NestJS Module** - Module, controller, service scaffolding
- **Create React Component** - Component with TypeScript props
- **Create Test** - Test file following project conventions
- **Create Django App** - App structure for Django projects
- **Create FastAPI Router** - Router module for FastAPI
- And more based on detected frameworks

### Skills

Debugging and navigation skills:

- **Project Overview** - Generated for every project with technology stack summary
- **Debugging with [framework]** - Test-driven debugging workflow
- **Framework-specific Debugging** - NestJS, Django, Spring Boot, etc.
- **Monorepo Navigation** - Working efficiently in monorepo structure

## Output Locations

Generated content is written to:

| Content Type | Location |
|--------------|----------|
| Standards | \`.packmind/standards/<name>.md\` |
| Commands | \`.packmind/commands/<name>.md\` |
| Skills | \`.claude/skills/<name>/SKILL.md\` |

## AI Agent Enhancement

After writing files, the onboarding process also updates AI agent configuration files (CLAUDE.md, .cursorrules, etc.) with instructions to help ${agentName} improve the generated content over time.

## Example Output

\`\`\`
$ packmind-cli init

Initializing Packmind...

Installing default skills...
Default skills: added 9 files, changed 0 files

Scanning project...

Project scan complete!

Detected:
  Languages: typescript, javascript
  Frameworks: nestjs, react
  Tools: eslint, prettier, nx
  Test Framework: jest
  Package Manager: npm
  Structure: Monorepo

============================================================
  GENERATED CONTENT PREVIEW
============================================================

Standards:
  1. TypeScript Coding Standards
     Apply TypeScript best practices for type safety and code quality
     Rules: 4

  2. NestJS Architecture Standards
     Apply NestJS architectural patterns for modular services
     Rules: 4

Commands:
  1. Create NestJS Module
     Create a new feature module in NestJS
     Steps: 5

Skills:
  1. project-overview
     Overview of this project's technology stack and structure

  2. debugging-with-jest
     Systematic debugging workflow using jest tests

============================================================

Write 4 generated files to disk? (y/n): y

Writing generated content to files...

Created 4 files:
  Standards:
    - .packmind/standards/typescript-coding-standards.md
    - .packmind/standards/nestjs-architecture-standards.md

  Commands:
    - .packmind/commands/create-nestjs-module.md

  Skills:
    - .claude/skills/project-overview/SKILL.md

Enhancement instructions added to:
    ~ CLAUDE.md (updated)

Packmind initialization complete!

Next steps:
  - Review generated files in .packmind/ and .claude/skills/
  - Install packages: packmind-cli install <package-slug>
  - Setup MCP integration: packmind-cli setup-mcp
\`\`\`

## Customizing Generated Content

After onboarding, you can:

1. **Edit generated files** - Modify standards, commands, or skills to match your exact needs
2. **Delete unwanted items** - Remove files that don't apply to your project
3. **Add to packages** - Organize content into Packmind packages for team distribution
4. **Re-run onboarding** - Use \`packmind-cli onboard\` to regenerate content after project changes

## Troubleshooting

### "No content was generated"

This means the scanner didn't detect any recognizable patterns. Try:

- Adding a \`CLAUDE.md\` or \`CONTRIBUTING.md\` with coding guidelines
- Ensuring your project has standard configuration files (package.json, tsconfig.json, etc.)

### "packmind-cli not found"

Install the CLI globally:

\`\`\`bash
npm install -g @packmind/cli
\`\`\`

### Files not written

- Check that you have write permissions in the project directory
- Run with \`--yes\` flag if prompts are stuck in non-interactive environments

## Quick Reference

| Command | Description |
|---------|-------------|
| \`packmind-cli init\` | Full initialization (skills + onboarding) |
| \`packmind-cli init --dry-run\` | Preview what would be generated |
| \`packmind-cli init --yes\` | Auto-approve file writing |
| \`packmind-cli init --skip-onboard\` | Only install default skills |
| \`packmind-cli onboard\` | Re-scan project and generate content |
| \`packmind-cli onboard --path ./other-project\` | Scan a different directory |
`;
}

const ONBOARD_README = `# Project Onboarding

A skill that guides AI coding agents through the process of initializing Packmind in a project.

## What is Onboarding?

Onboarding scans your project to detect technologies, patterns, and existing documentation, then generates project-specific standards, commands, and skills.

## How to Use

Ask the AI agent to initialize Packmind or onboard your project. The agent will automatically use this skill to guide the process.

### Example Prompts

- "Initialize Packmind in this project"
- "Onboard this project to Packmind"
- "Scan this project and generate coding standards"
- "Set up Packmind for this codebase"

The AI agent will:

1. Check prerequisites (packmind-cli installed and logged in)
2. Run the appropriate CLI command
3. Review the generated content with you
4. Help customize the output as needed

## Prerequisites

- **packmind-cli**: Required for onboarding
- **Packmind account**: Login via \`packmind-cli login\`

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
  deploy(agentName: string, skillsFolderPath: string): FileUpdates {
    const basePath = `${skillsFolderPath}packmind-onboard`;

    return {
      createOrUpdate: [
        {
          path: `${basePath}/SKILL.md`,
          content: getOnboardSkillMd(agentName),
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
