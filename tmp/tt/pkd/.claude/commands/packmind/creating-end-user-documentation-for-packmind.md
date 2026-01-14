---
description: Create clear and concise end-user documentation for Packmind features to empower users in accomplishing their tasks effectively while avoiding unnecessary technical details.
---

Create clear and concise end-user documentation for Packmind features to empower users in accomplishing their tasks effectively while avoiding unnecessary technical details.

## When to Use

- When documenting a new feature for end users
- When updating existing documentation to be more user-focused
- When you need to explain how users can accomplish specific tasks
- When converting developer-focused documentation to user-friendly guides

## Context Validation Checkpoints

* [ ] Have you analyzed the codebase to understand the feature thoroughly (backend API, packages, frontend, MCP server)?
* [ ] Have you reviewed existing documentation in docs/howto/ to understand the structure?
* [ ] Do you know whether you need to create a new file or update an existing one?
* [ ] Have you identified what users need to accomplish versus what developers need to know?

## Recipe Steps

### Step 1: Analyze the Codebase

Before writing any documentation, thoroughly understand the feature by analyzing backend API controllers and endpoints, packages domain logic and use cases, frontend UI components and forms, and MCP server tools and their parameters. Focus on identifying user-facing functionality versus internal processes.

### Step 2: Review Existing Documentation

Read all existing files in docs/howto/ to understand the current documentation structure, identify where your new content fits, check for overlapping or related information, and determine if you need to create a new file or update existing ones.

### Step 3: Determine Documentation Structure

Based on your analysis, decide whether to create a new file for a distinct new feature, update existing files if extending current functionality, or reorganize by extracting related content into dedicated files if needed.

### Step 4: Write User-Focused Content

Focus on end users who are using Packmind, not developers building it. Explain what users can accomplish, not how the system works internally. Use language that matches user goals and workflows. Be clear and concise, getting straight to the point with simple direct language. Avoid technical jargon and implementation details. Structure content for action: start with what the feature does, provide step-by-step instructions, and include clear examples of expected outcomes.

### Step 5: Avoid Common Mistakes

Skip technical implementation details like API endpoints, database schemas, or code architecture. Don't explain internal workflows or development processes. Avoid debugging information or development setup. Skip unnecessary sections like generic 'Best Practices' or 'Tips and Tricks' that don't solve real user problems. Remove references to development tools (nx, build processes), internal configuration (Sentry, Infisical), and code examples users won't interact with.

### Step 6: Use Documentation Template

Structure your documentation with: Feature Name as title, brief description of what it accomplishes, Overview of what users can do and why it's useful, Main Process sections with step-by-step actions, Troubleshooting for common user-facing issues with clear solutions, and Related Documentation links to other relevant guides.

```markdown
# [Feature Name]

Brief description of what this feature accomplishes for users.

## Overview

What users can do with this feature and why it's useful.

## [Main Process 1]

### Step 1: [Action]
Clear instructions with specific UI elements to click/interact with.

### Step 2: [Action]
Continue with logical sequence of user actions.

## Troubleshooting

- **Problem**: Specific user-facing issue
- **Solutions**: Clear steps to resolve

## Related Documentation

Link to other relevant how-to guides.
```

### Step 7: Remove Development Content

When updating existing documentation, remove architecture diagrams and technical sequences, code examples users don't interact with, development environment setup, internal tool configuration, API implementation details, and debug and development modes.

### Step 8: Create Cross-References

Ensure your documentation integrates well by linking to related guides where appropriate, updating existing files to reference your new content, creating a logical flow between related processes, and avoiding duplicating information across multiple files.

### Step 9: Review and Validate

Before finalizing, read through from a user's perspective, ensure all steps are actionable and clear, verify all links and references work, and check that the content matches actual UI/functionality.
