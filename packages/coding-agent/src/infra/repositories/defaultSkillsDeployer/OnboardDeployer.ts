import { FileUpdates } from '@packmind/types';
import { ISkillDeployer } from './IDefaultSkillDeployer';

function getOnboardSkillMd(agentName: string): string {
  return `---
name: 'packmind-onboard'
description: "Draft-first onboarding for Packmind. This skill helps ${agentName} guide users through scanning the project, generating a reviewable draft, and optionally pushing to Packmind after user approval."
license: 'Complete terms in LICENSE.txt'
---

# Packmind Draft-First Onboarding

This skill guides you through onboarding your project to Packmind using a **draft-first** approach: scan -> generate draft -> review -> optionally send.

## Prerequisites

Before running onboarding:

1. **CLI installed**: \`npm install -g @packmind/cli\`
2. **Logged in**: \`packmind-cli login\`
3. **Skills installed**: This skill is already installed if you're reading this

## Quick Start

Run the onboard command:

\`\`\`bash
packmind-cli onboard
\`\`\`

This will:
1. Show you what will happen (consent prompt)
2. Scan your project read-only
3. Generate draft files locally
4. Let you review before sending anything
5. Optionally send to Packmind on your approval

## Command Options

| Flag | Description |
|------|-------------|
| \`--output <path>\` | Where to write draft files |
| \`--format md\\|json\\|both\` | Output format (default: both) |
| \`--yes\` | Skip prompts and auto-send |
| \`--dry-run\` | Generate draft only, never send |
| \`--print\` | Print detailed summary to stdout |
| \`--open\` | Open markdown in default viewer |
| \`--send\` | Explicitly send existing draft |

## What Gets Scanned

The scanner detects (read-only, no modifications):

- **Languages**: TypeScript, JavaScript, Python, Go, Java, C#, etc.
- **Frameworks**: NestJS, React, Vue, Angular, Django, FastAPI, etc.
- **Tools**: ESLint, Prettier, Nx, Turbo, Jest, Vitest, etc.
- **Structure**: Monorepo, test directories, src directory

## What Gets Generated

### Draft Files

Two files are created in \`~/.packmind/cli/drafts/\` (or custom \`--output\`):

1. **packmind-onboard.draft.json** - Machine-readable payload
2. **packmind-onboard.draft.md** - Human-readable review document

### Baseline Items

Each item includes:
- **Label**: Short factual statement (e.g., "Uses TypeScript")
- **Type**: tooling, structure, convention, or agent
- **Confidence**: high or medium
- **Evidence**: File paths that prove the claim

Items are capped at 5-10, prioritizing high-confidence claims.

## Review Flow

After generating drafts, you'll see:

\`\`\`
What would you like to do?

  [Enter] Send draft to Packmind
  [e]     Open draft in editor
  [p]     Print summary
  [r]     Regenerate draft
  [q]     Quit without sending
\`\`\`

**Nothing is sent until you explicitly confirm.**

## Checking Status

See the current onboarding state:

\`\`\`bash
packmind-cli onboard-status
\`\`\`

Shows:
- Last run timestamp
- Baseline item count
- Draft file locations
- Push status (sent/unsent)

## Example Session

\`\`\`
$ packmind-cli onboard

============================================================
  PACKMIND ONBOARDING
============================================================

This will:
  1. Scan your repository (read-only, no modifications)
  2. Generate a local draft baseline file
  3. Let you review before sending anything

Nothing will be sent to Packmind without your approval.

Press Enter to continue, Ctrl+C to abort...

Generating repository fingerprint...
Scanning project (read-only)...
Found languages: typescript, javascript
Found frameworks: nestjs, react
Found tools: eslint, prettier, nx
Detected monorepo structure
Generating baseline items...
Writing draft files to /Users/you/.packmind/cli/drafts/...

Generated 7 baseline items

Draft files:
  JSON: /Users/you/.packmind/cli/drafts/packmind-onboard.draft.json
  Markdown: /Users/you/.packmind/cli/drafts/packmind-onboard.draft.md

What would you like to do?

  [Enter] Send draft to Packmind
  [e]     Open draft in viewer
  [p]     Print detailed summary
  [r]     Regenerate draft
  [q]     Quit without sending

Your choice:

Draft sent successfully!
Open the app to review and convert baseline items into rules.
\`\`\`

## Safety Guarantees

- **Read-only**: No files are modified in your repo
- **Draft-first**: Nothing sent without explicit approval
- **Factual only**: No architecture inference or recommendations
- **Evidence-backed**: Every claim has file path evidence
- **Deletable**: Draft files can be deleted anytime

## Troubleshooting

### "Not logged in"

Run \`packmind-cli login\` first.

### "No items generated"

Your project may lack recognizable config files. Ensure you have:
- package.json, tsconfig.json, or similar
- Standard project structure

### "Send failed"

Check your network connection. The draft files are preserved - try again with \`packmind-cli onboard --yes\`.
`;
}

const ONBOARD_README = `# Packmind Draft-First Onboarding

A skill that guides AI coding agents through the draft-first onboarding process for Packmind.

## What is Draft-First Onboarding?

This skill uses a **draft-first** approach:
1. Scan your project (read-only)
2. Generate a local draft baseline file
3. Let you review before sending anything
4. Optionally send to Packmind after your approval

**Nothing is sent to Packmind without explicit user confirmation.**

## How to Use

Ask the AI agent to onboard your project to Packmind. The agent will automatically use this skill to guide the process.

### Example Prompts

- "Onboard this project to Packmind"
- "Run packmind onboarding"
- "Generate a Packmind baseline for this project"
- "Scan this project for Packmind"

The AI agent will:

1. Check prerequisites (packmind-cli installed and logged in)
2. Run \`packmind-cli onboard\`
3. Review the generated draft with you
4. Help you decide whether to send or edit

## Prerequisites

- **packmind-cli**: Install with \`npm install -g @packmind/cli\`
- **Packmind account**: Login via \`packmind-cli login\`

## Safety

- Read-only scanning (no modifications to your repo)
- Draft files generated locally first
- User reviews before any network push
- Evidence-backed baseline items only

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
