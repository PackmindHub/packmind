import { FileUpdates } from '@packmind/types';
import { ISkillDeployer } from './IDefaultSkillDeployer';

const VALID_LANGUAGES = [
  'AVRO',
  'JAVASCRIPT',
  'JAVASCRIPT_JSX',
  'TYPESCRIPT',
  'TYPESCRIPT_TSX',
  'PYTHON',
  'PHP',
  'JAVA',
  'SCSS',
  'HTML',
  'CSHARP',
  'GENERIC',
  'GO',
  'C',
  'CPP',
  'SQL',
  'KOTLIN',
  'VUE',
  'CSS',
  'YAML',
  'JSON',
  'XML',
  'BASH',
  'MARKDOWN',
  'RUBY',
  'RUST',
  'SAP_ABAP',
  'SAP_CDS',
  'SAP_HANA_SQL',
  'SWIFT',
  'PROPERTIES',
];

function getInitPlaybookPy(): string {
  return `#!/usr/bin/env python3
"""
Playbook Initializer - Creates a new playbook template for coding standards

Usage:
    init_playbook.py <standard-name> --path <path>

Examples:
    init_playbook.py typescript-conventions --path .
    init_playbook.py react-patterns --path ./standards
    init_playbook.py api-guidelines --path /custom/location
"""

import sys
import json
from pathlib import Path


PLAYBOOK_TEMPLATE = {
    "name": "[TODO: Standard Name]",
    "description": "[TODO: A clear description of what this standard covers, why it exists, and what problems it solves.]",
    "scope": "[TODO: Where this standard applies (e.g., 'TypeScript files', 'React components', '*.spec.ts test files')]",
    "rules": [
        {
            "content": "[TODO: First rule starting with action verb (e.g., 'Use', 'Avoid', 'Prefer')]"
        },
        {
            "content": "[TODO: Second rule with examples]",
            "examples": {
                "positive": "[TODO: Code that correctly follows the rule]",
                "negative": "[TODO: Code that violates the rule]",
                "language": "TYPESCRIPT"
            }
        }
    ]
}


def title_case_name(name):
    """Convert hyphenated name to Title Case for display."""
    return ' '.join(word.capitalize() for word in name.split('-'))


def init_playbook(standard_name, path):
    """
    Initialize a new playbook JSON file from template.

    Args:
        standard_name: Name of the standard (used for filename)
        path: Path where the playbook file should be created

    Returns:
        Path to created playbook file, or None if error
    """
    output_path = Path(path).resolve()

    # Ensure output directory exists
    if not output_path.exists():
        try:
            output_path.mkdir(parents=True, exist_ok=True)
            print(f"✅ Created directory: {output_path}")
        except Exception as e:
            print(f"❌ Error creating directory: {e}")
            return None

    # Create playbook filename
    filename = f"{standard_name}.playbook.json"
    playbook_path = output_path / filename

    # Check if file already exists
    if playbook_path.exists():
        print(f"❌ Error: Playbook file already exists: {playbook_path}")
        return None

    # Create playbook from template
    playbook = PLAYBOOK_TEMPLATE.copy()
    playbook["name"] = title_case_name(standard_name)

    try:
        with open(playbook_path, 'w', encoding='utf-8') as f:
            json.dump(playbook, f, indent=2, ensure_ascii=False)
        print(f"✅ Created playbook: {playbook_path}")
    except Exception as e:
        print(f"❌ Error creating playbook: {e}")
        return None

    # Print next steps
    print(f"\\n✅ Playbook '{standard_name}' initialized successfully")
    print("\\nNext steps:")
    print("1. Edit the playbook to replace all [TODO:...] placeholders")
    print("2. Add more rules as needed (each rule should start with an action verb)")
    print("3. Add examples to rules where helpful (positive, negative, language)")
    print("4. Run the validator to check the playbook format:")
    print(f"   python3 scripts/validate_playbook.py {playbook_path}")
    print("5. Create the standard via CLI:")
    print(f"   packmind-cli standard create {playbook_path}")

    return playbook_path


def main():
    if len(sys.argv) < 4 or sys.argv[2] != '--path':
        print("Usage: init_playbook.py <standard-name> --path <path>")
        print("\\nStandard name requirements:")
        print("  - Hyphen-case identifier (e.g., 'typescript-conventions')")
        print("  - Will be converted to Title Case for the standard name")
        print("\\nExamples:")
        print("  init_playbook.py typescript-conventions --path .")
        print("  init_playbook.py react-patterns --path ./standards")
        print("  init_playbook.py api-guidelines --path /custom/location")
        sys.exit(1)

    standard_name = sys.argv[1]
    path = sys.argv[3]

    print(f"🚀 Initializing playbook: {standard_name}")
    print(f"   Location: {path}")
    print()

    result = init_playbook(standard_name, path)

    if result:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
`;
}

function getValidatePlaybookPy(): string {
  const validLanguagesJson = JSON.stringify(VALID_LANGUAGES);
  return `#!/usr/bin/env python3
"""
Playbook Validator - Validates playbook JSON format for coding standards

Usage:
    validate_playbook.py <playbook.json>

Examples:
    validate_playbook.py typescript-conventions.playbook.json
    validate_playbook.py ./standards/react-patterns.playbook.json
"""

import sys
import json
import re
from pathlib import Path


VALID_LANGUAGES = ${validLanguagesJson}

# Action verbs that rules should start with
ACTION_VERBS = [
    'use', 'avoid', 'prefer', 'include', 'exclude', 'apply', 'implement',
    'follow', 'ensure', 'define', 'declare', 'create', 'add', 'remove',
    'replace', 'convert', 'validate', 'check', 'verify', 'test', 'handle',
    'catch', 'throw', 'return', 'call', 'invoke', 'import', 'export',
    'extend', 'inherit', 'override', 'implement', 'abstract', 'wrap',
    'extract', 'refactor', 'rename', 'move', 'copy', 'delete', 'update',
    'keep', 'maintain', 'organize', 'structure', 'format', 'indent',
    'align', 'space', 'name', 'prefix', 'suffix', 'capitalize', 'lowercase',
    'separate', 'combine', 'merge', 'split', 'group', 'nest', 'flatten',
    'limit', 'restrict', 'allow', 'enable', 'disable', 'require', 'enforce',
    'set', 'configure', 'initialize', 'setup', 'register', 'inject', 'provide',
    'specify', 'annotate', 'document', 'comment', 'log', 'debug', 'trace',
    'write', 'read', 'parse', 'serialize', 'deserialize', 'encode', 'decode',
    'encrypt', 'decrypt', 'hash', 'sign', 'authenticate', 'authorize',
    'sanitize', 'escape', 'quote', 'unquote', 'trim', 'strip', 'pad',
    'always', 'never', 'only', 'do', 'don\\'t', 'must', 'should', 'shall',
]


def validate_playbook(playbook_path):
    """
    Validate a playbook JSON file.

    Args:
        playbook_path: Path to the playbook JSON file

    Returns:
        Tuple of (is_valid, list of error messages)
    """
    playbook_path = Path(playbook_path)
    errors = []
    warnings = []

    # Check file exists
    if not playbook_path.exists():
        return False, [f"File not found: {playbook_path}"]

    # Check file extension
    if not playbook_path.suffix == '.json':
        warnings.append(f"Warning: File extension is '{playbook_path.suffix}', expected '.json'")

    # Read and parse JSON
    try:
        with open(playbook_path, 'r', encoding='utf-8') as f:
            playbook = json.load(f)
    except json.JSONDecodeError as e:
        return False, [f"Invalid JSON: {e}"]
    except Exception as e:
        return False, [f"Error reading file: {e}"]

    # Validate required fields
    if not isinstance(playbook, dict):
        return False, ["Playbook must be a JSON object"]

    # Check 'name' field
    if 'name' not in playbook:
        errors.append("Missing required field: 'name'")
    elif not isinstance(playbook['name'], str) or not playbook['name'].strip():
        errors.append("'name' must be a non-empty string")
    elif playbook['name'].startswith('[TODO:'):
        errors.append("'name' still contains TODO placeholder")

    # Check 'description' field
    if 'description' not in playbook:
        errors.append("Missing required field: 'description'")
    elif not isinstance(playbook['description'], str) or not playbook['description'].strip():
        errors.append("'description' must be a non-empty string")
    elif playbook['description'].startswith('[TODO:'):
        errors.append("'description' still contains TODO placeholder")

    # Check 'scope' field
    if 'scope' not in playbook:
        errors.append("Missing required field: 'scope'")
    elif not isinstance(playbook['scope'], str) or not playbook['scope'].strip():
        errors.append("'scope' must be a non-empty string")
    elif playbook['scope'].startswith('[TODO:'):
        errors.append("'scope' still contains TODO placeholder")

    # Check 'rules' field
    if 'rules' not in playbook:
        errors.append("Missing required field: 'rules'")
    elif not isinstance(playbook['rules'], list):
        errors.append("'rules' must be an array")
    elif len(playbook['rules']) == 0:
        errors.append("'rules' must contain at least one rule")
    else:
        # Validate each rule
        for i, rule in enumerate(playbook['rules']):
            rule_prefix = f"rules[{i}]"

            if not isinstance(rule, dict):
                errors.append(f"{rule_prefix}: must be an object")
                continue

            # Check 'content' field
            if 'content' not in rule:
                errors.append(f"{rule_prefix}: missing required field 'content'")
            elif not isinstance(rule['content'], str) or not rule['content'].strip():
                errors.append(f"{rule_prefix}: 'content' must be a non-empty string")
            elif rule['content'].startswith('[TODO:'):
                errors.append(f"{rule_prefix}: 'content' still contains TODO placeholder")
            else:
                # Check if rule starts with action verb
                first_word = rule['content'].split()[0].lower().rstrip(':,')
                if first_word not in ACTION_VERBS:
                    warnings.append(f"{rule_prefix}: 'content' should start with an action verb (e.g., 'Use', 'Avoid', 'Prefer'). Found: '{first_word}'")

            # Validate examples if present
            if 'examples' in rule:
                examples = rule['examples']
                example_prefix = f"{rule_prefix}.examples"

                if not isinstance(examples, dict):
                    errors.append(f"{example_prefix}: must be an object")
                else:
                    # Check required example fields
                    if 'positive' not in examples:
                        errors.append(f"{example_prefix}: missing required field 'positive'")
                    elif not isinstance(examples['positive'], str):
                        errors.append(f"{example_prefix}: 'positive' must be a string")
                    elif examples['positive'].startswith('[TODO:'):
                        errors.append(f"{example_prefix}: 'positive' still contains TODO placeholder")

                    if 'negative' not in examples:
                        errors.append(f"{example_prefix}: missing required field 'negative'")
                    elif not isinstance(examples['negative'], str):
                        errors.append(f"{example_prefix}: 'negative' must be a string")
                    elif examples['negative'].startswith('[TODO:'):
                        errors.append(f"{example_prefix}: 'negative' still contains TODO placeholder")

                    if 'language' not in examples:
                        errors.append(f"{example_prefix}: missing required field 'language'")
                    elif not isinstance(examples['language'], str):
                        errors.append(f"{example_prefix}: 'language' must be a string")
                    elif examples['language'] not in VALID_LANGUAGES:
                        errors.append(f"{example_prefix}: 'language' must be one of: {', '.join(VALID_LANGUAGES[:10])}... (see full list in validator)")

    return len(errors) == 0, errors, warnings


def main():
    if len(sys.argv) != 2:
        print("Usage: validate_playbook.py <playbook.json>")
        print("\\nExamples:")
        print("  validate_playbook.py typescript-conventions.playbook.json")
        print("  validate_playbook.py ./standards/react-patterns.playbook.json")
        sys.exit(1)

    playbook_path = sys.argv[1]
    print(f"🔍 Validating playbook: {playbook_path}")
    print()

    result = validate_playbook(playbook_path)

    if len(result) == 3:
        is_valid, errors, warnings = result
    else:
        is_valid, errors = result
        warnings = []

    # Print warnings
    if warnings:
        print("⚠️  Warnings:")
        for warning in warnings:
            print(f"   {warning}")
        print()

    # Print errors
    if errors:
        print("❌ Validation errors:")
        for error in errors:
            print(f"   {error}")
        print()
        print("❌ Playbook validation failed")
        sys.exit(1)
    else:
        print("✅ Playbook is valid!")
        sys.exit(0)


if __name__ == "__main__":
    main()
`;
}

function getStandardCreatorSkillMd(agentName: string): string {
  return `---
name: 'packmind-standard-creator'
description: "Guide for creating coding standards via the Packmind CLI. This skill should be used when users want to create a new coding standard (or add rules to an existing standard) that captures team conventions, best practices, or coding guidelines for distribution to ${agentName}."
license: 'Complete terms in LICENSE.txt'
---

# Standard Creator

This skill provides a complete walkthrough for creating coding standards via the Packmind CLI.

## About Coding Standards

Coding standards are collections of rules that capture team conventions, best practices, and coding guidelines. They help maintain consistency across codebases and enable ${agentName} to follow your team's specific practices.

### What Standards Provide

1. **Consistent code style** - Rules that enforce naming conventions, formatting, and structure
2. **Best practices** - Guidelines for error handling, testing, security, and performance
3. **Domain knowledge** - Company-specific patterns, architectural decisions, and business logic
4. **Code examples** - Positive/negative examples that demonstrate correct vs incorrect usage

### Standard Structure

Every standard consists of:

\`\`\`
{
  "name": "Standard Name",
  "description": "What the standard covers and why",
  "scope": "Where/when the standard applies",
  "rules": [
    {
      "content": "Rule description starting with action verb",
      "examples": {
        "positive": "Valid code example",
        "negative": "Invalid code example",
        "language": "TYPESCRIPT"
      }
    }
  ]
}
\`\`\`

## Prerequisites

Before creating a standard, verify that the required tools are available:

### Python 3

Check if Python 3 is installed:

\`\`\`bash
python3 --version
\`\`\`

If not available, install it:
- **macOS**: \`brew install python3\`
- **Ubuntu/Debian**: \`sudo apt-get install python3\`
- **Windows**: Download from https://python.org or use \`winget install Python.Python.3\`

### Packmind CLI

Check if packmind-cli is installed:

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

## Standard Creation Process

To create a standard, follow this process in order, skipping steps only if there is a clear reason why they are not applicable.

### Step 1: Understanding the Standard's Purpose

Skip this step only when the standard's scope and rules are already clearly defined. It remains valuable even when working with an existing standard.

To create an effective standard, clearly understand:

1. **What problem does this standard solve?**
   - Example: "Inconsistent error handling across services"
   - Example: "New team members don't know our naming conventions"

2. **Who will benefit from this standard?**
   - AI coding agents working on this codebase
   - New team members onboarding
   - Existing developers maintaining consistency

3. **Where does this standard apply?**
   - Specific file types (e.g., "*.spec.ts files")
   - Specific frameworks (e.g., "React components")
   - Specific domains (e.g., "API controllers")

Example clarifying questions:

- "What coding conventions do you want to enforce?"
- "Can you give examples of code that follows vs violates these rules?"
- "Which file types or areas of the codebase should this standard apply to?"

Conclude this step when there is a clear sense of the standard's purpose and scope.

### Step 2: Gathering and Writing Rules

Transform the understanding from Step 1 into concrete rules.

#### Rule Writing Guidelines

Each rule should:

1. **Start with an action verb** - Use imperative form (e.g., "Use", "Avoid", "Prefer", "Include")
2. **Be specific and actionable** - Avoid vague guidance
3. **Focus on one concept** - One rule per convention

**Good rules:**
- "Use const instead of let for variables that are never reassigned"
- "Prefix interface names with I (e.g., IUserService)"
- "Include error messages in all thrown exceptions"

**Bad rules:**
- "Write good code" (too vague)
- "Use const and prefix interfaces with I" (multiple concepts)
- "Don't use var" (no positive guidance)

#### Adding Examples (Recommended)

Examples dramatically improve rule effectiveness. For each rule, consider adding:

- **positive**: Code that correctly follows the rule
- **negative**: Code that violates the rule
- **language**: The programming language for syntax highlighting

Valid language values:
- TYPESCRIPT, TYPESCRIPT_TSX
- JAVASCRIPT, JAVASCRIPT_JSX
- PYTHON, JAVA, GO, RUST, CSHARP
- PHP, RUBY, KOTLIN, SWIFT, SQL
- HTML, CSS, SCSS, YAML, JSON
- MARKDOWN, BASH, GENERIC

### Step 3: Creating the Playbook File

**Before running the script**, verify that python3 is available (see Prerequisites section). If not installed, install it first.

When creating a new standard from scratch, use the \`init_playbook.py\` script to generate a template playbook file:

\`\`\`bash
python3 scripts/init_playbook.py <standard-name> --path <output-directory>
\`\`\`

Example:
\`\`\`bash
python3 scripts/init_playbook.py typescript-conventions --path .
\`\`\`

The script generates a JSON file (named \`<standard-name>.playbook.json\`) with the following structure:

\`\`\`json
{
  "name": "Your Standard Name",
  "description": "A clear description of what this standard covers, why it exists, and what problems it solves.",
  "scope": "Where this standard applies (e.g., 'TypeScript files', 'React components', '*.spec.ts test files')",
  "rules": [
    {
      "content": "First rule starting with action verb"
    },
    {
      "content": "Second rule with examples",
      "examples": {
        "positive": "const x = getValue();",
        "negative": "let x = getValue();",
        "language": "TYPESCRIPT"
      }
    }
  ]
}
\`\`\`

#### Validation Requirements

- **name**: Non-empty string
- **description**: Non-empty string explaining purpose
- **scope**: Non-empty string describing applicability
- **rules**: Array with at least one rule
- **rules[].content**: Non-empty string starting with action verb
- **rules[].examples** (optional): If provided, must include positive, negative, and language

#### Validating the Playbook

Before creating the standard via CLI, validate the playbook to catch errors early:

\`\`\`bash
python3 scripts/validate_playbook.py <path-to-playbook.json>
\`\`\`

Example:
\`\`\`bash
python3 scripts/validate_playbook.py typescript-conventions.playbook.json
\`\`\`

The validator checks:
- All required fields are present (name, description, scope, rules)
- No TODO placeholders remain
- Rules start with action verbs
- Example fields are complete when provided
- Language values are valid

If validation fails, fix the reported errors and run validation again before proceeding.

### Step 4: Review Before Submission

**Before running the CLI command**, you MUST get explicit user approval:

1. Show the user the complete playbook content in a formatted preview:
   - Name
   - Description
   - Scope
   - Each rule with its content and examples (if any)

2. Ask: **"Here is the standard that will be created on Packmind. Do you approve?"**

3. **Wait for explicit user confirmation** before proceeding to Step 5.

4. If the user requests changes, go back to Step 2 or Step 3 to make adjustments.

### Step 5: Creating the Standard via CLI

Run the packmind-cli command to create the standard:

\`\`\`bash
packmind-cli standard create <path-to-playbook.json>
\`\`\`

Example:
\`\`\`bash
packmind-cli standard create ./typescript-conventions.playbook.json
\`\`\`

Expected output on success:
\`\`\`
packmind-cli Standard "Your Standard Name" created successfully (ID: <uuid>)
\`\`\`

#### Troubleshooting

**"Not logged in" error:**
\`\`\`bash
packmind-cli login
\`\`\`

**"Failed to resolve global space" error:**
- Verify your API key is valid
- Check network connectivity to Packmind server

**JSON validation errors:**
- Ensure all required fields are present
- Verify JSON syntax is valid (use a JSON validator)
- Check that rules array has at least one entry

### Step 6: Verifying the Standard

After creation, verify the standard was created correctly:

1. **Check in Packmind UI**: Navigate to your organization's standards to see the new standard
2. **Verify rules**: Ensure all rules appear with correct content
3. **Check examples**: Confirm code examples are properly formatted

### Step 7: Iterate and Improve

Standards benefit from iteration. Consider:

1. **Add more rules** as new conventions emerge
2. **Add examples** to rules that lack them
3. **Refine rule wording** based on how AI agents interpret them
4. **Update scope** as the standard's applicability becomes clearer

To add rules to an existing standard, use the Packmind UI or API.

## Complete Example

Here's a complete example creating a TypeScript testing standard:

**File: testing-conventions.playbook.json**
\`\`\`json
{
  "name": "TypeScript Testing Conventions",
  "description": "Enforce consistent testing patterns in TypeScript test files to improve readability, maintainability, and reliability of the test suite.",
  "scope": "TypeScript test files (*.spec.ts, *.test.ts)",
  "rules": [
    {
      "content": "Use descriptive test names that explain the expected behavior",
      "examples": {
        "positive": "it('returns empty array when no items match filter')",
        "negative": "it('test filter')",
        "language": "TYPESCRIPT"
      }
    },
    {
      "content": "Follow Arrange-Act-Assert pattern in test structure",
      "examples": {
        "positive": "const input = createInput();\\nconst result = processInput(input);\\nexpect(result).toEqual(expected);",
        "negative": "expect(processInput(createInput())).toEqual(expected);",
        "language": "TYPESCRIPT"
      }
    },
    {
      "content": "Use one assertion per test for better error isolation",
      "examples": {
        "positive": "it('validates name', () => { expect(result.name).toBe('test'); });\\nit('validates age', () => { expect(result.age).toBe(25); });",
        "negative": "it('validates user', () => { expect(result.name).toBe('test'); expect(result.age).toBe(25); });",
        "language": "TYPESCRIPT"
      }
    },
    {
      "content": "Avoid using 'should' at the start of test names - use assertive verb-first naming"
    }
  ]
}
\`\`\`

**Creating the standard:**
\`\`\`bash
packmind-cli standard create testing-conventions.playbook.json
\`\`\`

## Quick Reference

| Field | Required | Description |
|-------|----------|-------------|
| name | Yes | Standard name |
| description | Yes | What and why |
| scope | Yes | Where it applies |
| rules | Yes | At least one rule |
| rules[].content | Yes | Rule text (verb-first) |
| rules[].examples | No | Code examples |
| examples.positive | If examples | Valid code |
| examples.negative | If examples | Invalid code |
| examples.language | If examples | Language ID |
`;
}

const STANDARD_CREATOR_README = `# Standard Creator

A skill that guides AI coding agents through the process of creating coding standards via the Packmind CLI.

## What is a Coding Standard?

Coding standards are collections of rules that capture team conventions, best practices, and coding guidelines. They enable AI coding agents to follow your team's specific practices.

## How to Use

Ask the AI agent to create a coding standard. The agent will automatically use this skill to guide the process.

### Example Prompts

- "Create a standard for TypeScript naming conventions"
- "Help me build a coding standard for our React components"
- "I want to create a standard for error handling in our API"
- "Create a new standard for test file conventions"

The AI agent will:

1. Ask clarifying questions to understand the standard's purpose
2. Help you define rules with proper formatting
3. Initialize a playbook template using the bundled scripts
4. Validate the playbook before submission
5. Run the CLI command to create the standard
6. Verify the standard was created correctly

## Prerequisites

Before using this skill, ensure you have:

- **Python 3**: Required for playbook initialization and validation
- **packmind-cli**: Required for standard creation
- **Packmind account**: Login via \`packmind-cli login\`

## Directory Structure

\`\`\`
packmind-standard-creator/
├── SKILL.md           # Instructions for the AI agent
├── README.md          # This file (for humans)
├── LICENSE.txt        # Apache 2.0 license
└── scripts/
    ├── init_playbook.py      # Initialize a new playbook from template
    └── validate_playbook.py  # Validate playbook format and rules
\`\`\`

## License

Apache 2.0 - See LICENSE.txt for details.
`;

const STANDARD_CREATOR_LICENSE = `
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

export class StandardCreatorDeployer implements ISkillDeployer {
  deploy(agentName: string, skillsFolderPath: string): FileUpdates {
    const basePath = `${skillsFolderPath}packmind-standard-creator`;

    return {
      createOrUpdate: [
        {
          path: `${basePath}/SKILL.md`,
          content: getStandardCreatorSkillMd(agentName),
        },
        {
          path: `${basePath}/README.md`,
          content: STANDARD_CREATOR_README,
        },
        {
          path: `${basePath}/LICENSE.txt`,
          content: STANDARD_CREATOR_LICENSE,
        },
        {
          path: `${basePath}/scripts/init_playbook.py`,
          content: getInitPlaybookPy(),
        },
        {
          path: `${basePath}/scripts/validate_playbook.py`,
          content: getValidatePlaybookPy(),
        },
      ],
      delete: [],
    };
  }
}
