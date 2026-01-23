---
name: 'packmind-standard-creator'
description: 'Guide for creating coding standards via the Packmind CLI. This skill should be used when users want to create a new coding standard (or add rules to an existing standard) that captures team conventions, best practices, or coding guidelines for distribution to Claude.'
license: 'Complete terms in LICENSE.txt'
---

# Standard Creator

This skill provides a complete walkthrough for creating coding standards via the Packmind CLI.

## About Coding Standards

Coding standards are collections of rules that capture team conventions, best practices, and coding guidelines. They help maintain consistency across codebases and enable Claude to follow your team's specific practices.

### What Standards Provide

1. **Consistent code style** - Rules that enforce naming conventions, formatting, and structure
2. **Best practices** - Guidelines for error handling, testing, security, and performance
3. **Domain knowledge** - Company-specific patterns, architectural decisions, and business logic
4. **Code examples** - Positive/negative examples that demonstrate correct vs incorrect usage

### Standard Structure

Every standard consists of:

```
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
```

## Prerequisites

Before creating a standard, verify that the required tools are available:

### Python 3

Check if Python 3 is installed:

```bash
python3 --version
```

If not available, install it:

- **macOS**: `brew install python3`
- **Ubuntu/Debian**: `sudo apt-get install python3`
- **Windows**: Download from https://python.org or use `winget install Python.Python.3`

### Packmind CLI

Check if packmind-cli is installed:

```bash
packmind-cli --version
```

If not available, install it:

```bash
npm install -g @packmind/cli
```

Then login to Packmind:

```bash
packmind-cli login
```

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
   - Specific file types (e.g., "\*.spec.ts files")
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

When creating a new standard from scratch, use the `init_playbook.py` script to generate a template playbook file:

```bash
python3 scripts/init_playbook.py <standard-name> --path <output-directory>
```

Example:

```bash
python3 scripts/init_playbook.py typescript-conventions --path .
```

The script generates a JSON file (named `<standard-name>.playbook.json`) with the following structure:

```json
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
```

#### Validation Requirements

- **name**: Non-empty string
- **description**: Non-empty string explaining purpose
- **scope**: Non-empty string describing applicability
- **rules**: Array with at least one rule
- **rules[].content**: Non-empty string starting with action verb
- **rules[].examples** (optional): If provided, must include positive, negative, and language

#### Validating the Playbook

Before creating the standard via CLI, validate the playbook to catch errors early:

```bash
python3 scripts/validate_playbook.py <path-to-playbook.json>
```

Example:

```bash
python3 scripts/validate_playbook.py typescript-conventions.playbook.json
```

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

```bash
packmind-cli standard create <path-to-playbook.json>
```

Example:

```bash
packmind-cli standard create ./typescript-conventions.playbook.json
```

Expected output on success:

```
packmind-cli Standard "Your Standard Name" created successfully (ID: <uuid>)
```

#### Troubleshooting

**"Not logged in" error:**

```bash
packmind-cli login
```

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

```json
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
        "positive": "const input = createInput();\nconst result = processInput(input);\nexpect(result).toEqual(expected);",
        "negative": "expect(processInput(createInput())).toEqual(expected);",
        "language": "TYPESCRIPT"
      }
    },
    {
      "content": "Use one assertion per test for better error isolation",
      "examples": {
        "positive": "it('validates name', () => { expect(result.name).toBe('test'); });\nit('validates age', () => { expect(result.age).toBe(25); });",
        "negative": "it('validates user', () => { expect(result.name).toBe('test'); expect(result.age).toBe(25); });",
        "language": "TYPESCRIPT"
      }
    },
    {
      "content": "Avoid using 'should' at the start of test names - use assertive verb-first naming"
    }
  ]
}
```

**Creating the standard:**

```bash
packmind-cli standard create testing-conventions.playbook.json
```

## Quick Reference

| Field             | Required    | Description            |
| ----------------- | ----------- | ---------------------- |
| name              | Yes         | Standard name          |
| description       | Yes         | What and why           |
| scope             | Yes         | Where it applies       |
| rules             | Yes         | At least one rule      |
| rules[].content   | Yes         | Rule text (verb-first) |
| rules[].examples  | No          | Code examples          |
| examples.positive | If examples | Valid code             |
| examples.negative | If examples | Invalid code           |
| examples.language | If examples | Language ID            |
