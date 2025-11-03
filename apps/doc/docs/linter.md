# Linter: Automated Detection of Coding Rules

:::info Enterprise Feature
This functionality is only available in the **Enterprise** version of Packmind.
:::

:::warning LLM Connection Required
The linter feature requires an LLM (Large Language Model) connection to generate detection programs. This is **enabled by default** on Packmind Cloud. For self-hosted installations, you need to configure your OpenAI API key. See [Install Packmind on your server](./gs-install-self-hosted.md#connect-your-llm-optional-but-important) for configuration instructions.
:::

## Overview

Packmind's linter automatically detects violations of your team's coding rules in your codebase. Instead of manually reviewing code for compliance, Packmind uses AI to generate **deterministic** detection programs that identify when your rules are not being followed.

For each coding rule you define, Packmind can create language-specific detection programs. These programs analyze your code and report violations, helping your team maintain consistent code quality.

## How Detection Works

When you create a rule in Packmind, the system can automatically detect violations through a multi-step process:

### Step 1: Add Code Examples to Your Rule

Before Packmind can detect violations, you need to provide code examples for each programming language you want to support. Code examples show the AI what compliant and non-compliant code looks like.

**Requirements:**

- Each language must have at least one **negative example** (code that violates the rule)
- We recommend adding multiple positive examples (compliant code) and negative examples (violations)
- More examples improve the quality and accuracy of detection

To add code examples to a rule, see the [Standards Management](./standards-management.md) documentation.

### Step 2: Assessment - Can This Rule Be Detected?

Once you've added code examples, Packmind **automatically triggers** an assessment to determine whether automated detection is possible for your rule.

:::tip Automatic Assessment
When you create a standard through the MCP server, all rules with code examples will have their assessment run automatically in the background. You don't need to manually trigger the assessment process.
:::

The AI analyzes:

- The rule's description and guidelines
- The code examples you provided
- The complexity and specificity of the rule

**Assessment Results:**

**Positive Assessment**: The rule contains enough detail to create an automated detector. Packmind will proceed to generate a detection program.

**Negative Assessment**: The rule is too vague or complex for automated detection. Packmind explains why detection isn't possible. Common reasons include:

- The rule is subjective or depends on team context
- The rule requires analyzing multiple files (not supported yet by the current linter capabilities)
- The rule lacks specific, measurable criteria

:::info Coming soon
We're working to let users refine instructions for AI agent to better understand how to detect violations
:::

### Step 3: Program Generation

When assessment is positive, Packmind uses AI to generate a detection program for your rule.

**What happens during generation:**

- AI creates JavaScript source code that analyzes your code files
- The program examines code structure to identify violations
- Multiple generation attempts occur if initial versions don't pass validation
- Generated programs are tested against your code examples to ensure accuracy

**Program Testing:**

- Negative examples must be flagged as violations
- Positive examples must not be flagged as violations
- If tests fail, Packmind refines the program and tries again

### Step 4: Draft Version Created

When program generation succeeds, Packmind creates a new **draft version** of the detection program.

Draft versions are not automatically used for detection. This gives you the opportunity to validate the program before it becomes active.
You can test the program behavior against a source code using the sandbox module in the interface, or using the CLI.

## Understanding Program Versions

Packmind manages detection programs using a versioning system:

### Draft vs Active Programs

**Draft Program**: A newly generated or updated detection program that hasn't been validated yet. Draft programs can be tested but are not used for actual code analysis. It's a measure to avoid deploying versions of programs that could affect the analysis in your CI/CD pipelines for instance.

**Active Program**: The validated program currently used to detect violations in your codebase. Only one program can be active per rule and language combination.

### Multiple Languages, Independent Programs

Each rule can have detection programs for multiple programming languages supported by Packmind (JavaScript, TypeScript, ...)

**Important**: Each language's detection program is completely independent. Generating or updating the JavaScript program doesn't affect the TypeScript program for the same rule.

### Promoting a Draft to Active

To make a draft program active:

1. Test the draft program to verify it works correctly
2. Promote the draft to active status
3. The draft becomes the active program and will be used for all future code analysis

Only programs with a "READY" status can be promoted to active.

## Testing Draft Programs

Before promoting a draft program to active, you should test it to ensure it correctly detects violations.

### Test in the Web Interface

Use the **Sandbox** module in the Packmind interface to test your draft program:

1. Navigate to your rule's detection settings
2. Select the draft program you want to test
3. Enter or paste sample code in the sandbox
4. Run the detection to see if violations are correctly identified

### Test with CLI

You can also test draft programs using the Packmind CLI. This allows you to run the draft program against your actual codebase before activating it.

For complete CLI testing instructions, see the [CLI documentation](./cli.md).

## Multi-Language Detection Strategy

When creating rules that apply to multiple languages:

1. **Add examples for each language**: Create separate positive and negative code examples for JavaScript, TypeScript, Java, etc.

2. **Run assessment for each language**: Packmind assesses each language independently. A rule might be detectable in one language but not another.

3. **Generate programs separately**: Each language gets its own detection program with its own version history.

4. **Activate independently**: You can activate the TypeScript program while keeping the JavaScript program in draft.

## Related Documentation

- [Standards Management](./standards-management.md): Learn how to create rules and add code examples
- [CLI](./cli.md): Test detection programs from the command line
