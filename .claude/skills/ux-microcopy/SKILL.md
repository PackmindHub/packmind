---
name: ux-microcopy
description: 'This skill provides senior UX writing expertise for crafting user-facing microcopy. It should be used when writing or reviewing UI text such as blank states, error messages, success messages, confirmation dialogs, tooltips, form labels, validation messages, loading states, onboarding text, CTAs, or any frontend component that communicates intention to the user. Also triggers when writing CLI output messages (progress feedback, errors, success confirmations, usage hints). Triggers on user-facing string literals in frontend code, empty state components, error boundaries, toast/notification text, modal copy, placeholder text, and CLI console.log/chalk/ora output messages.'
---

# UX Microcopy

## Overview

Apply senior UX writing principles to produce clear, concise, and helpful microcopy for the Packmind product. All copy must be in English, use a formal tone, and follow the guidelines below to ensure a consistent, professional user experience.

## Voice and Tone

- **Formal but approachable** - Write with authority and clarity, without being cold or robotic.
- **Concise** - Every word must earn its place. Remove filler words and redundant phrases.
- **Action-oriented** - Guide users toward what they can do, not just what went wrong.
- **Empathetic** - Acknowledge the user's situation without being patronizing.
- **Consistent** - Use the same terms and patterns across the product.
- **No emojis** - Use text formatting (bold, capitalization, punctuation, indentation) for emphasis and visual hierarchy instead of emojis.
- **Context-aware specificity** - Avoid repeating information the surrounding UI already provides. If the page or section makes the object clear, keep labels short (e.g., "Create" on a Packages page, not "Create package"). Add specificity only when needed for disambiguation.

## Terminology

- Never use the term "recipes" (deprecated). Use "standards" instead.
- Prefer product-specific vocabulary already established in the codebase (e.g., "space", "package", "standard", "command", "skill").
- Avoid jargon unless it is well-established in the product domain.

## Guidelines by Copy Type

### Blank States

Blank states appear when a list, page, or section has no content yet. They are an opportunity to orient the user and encourage action.

**Structure:**
1. **Headline** - State what belongs here (not that it is empty)
2. **Description** (optional) - Explain the value or purpose in one sentence
3. **Call to action** - A clear verb-first button or link label

**Principles:**
- Do not say "Nothing here yet", "No data found", or "It looks empty". Instead, frame around the value the feature provides.
- Lead with what the user can do, not what is missing.
- Keep the headline under 8 words.

**Example:**

```
Headline:    Organize your standards into packages
Description: Packages group related standards for easy distribution to your team.
CTA:         Create a package
```

### Error Messages

**Structure:**
1. **What happened** - A clear, jargon-free description of the problem
2. **Why it happened** (if known and useful to the user)
3. **What to do next** - A concrete recovery action

**Principles:**
- Never blame the user. Avoid "You did something wrong" or "Invalid input".
- Be specific. "Unable to save changes" is better than "Something went wrong".
- Provide an actionable next step when possible.
- For technical errors the user cannot resolve, suggest contacting support or trying again.

**Example:**

```
Title:       Unable to save your changes
Description: The server could not be reached. Check your connection and try again.
CTA:         Retry
```

### Success Messages

**Principles:**
- Confirm the completed action in past tense ("Package created" not "Package has been created successfully").
- Keep it to one short sentence or a phrase.
- Only add detail if the user needs to take a follow-up action.

**Example:**

```
"Standard published to your team"
"Package created — add standards to get started"
```

### Confirmation Dialogs

**Structure:**
1. **Title** - Name the action being confirmed (verb + object)
2. **Description** - Explain consequences, especially for destructive actions
3. **Primary action** - Match the title verb (e.g., "Delete", "Remove", "Archive")
4. **Secondary action** - Always "Cancel"

**Principles:**
- For destructive actions, state what will be lost and whether the action is reversible.
- Never use "Are you sure?" as the title.
- The primary button label should match the action verb in the title.

**Example:**

```
Title:            Delete this standard?
Description:      This standard will be permanently removed from the package. This action cannot be undone.
Primary action:   Delete
Secondary action: Cancel
```

### Tooltips and Helper Text

**Principles:**
- Answer "what is this?" or "why would I use this?" in one sentence.
- Do not repeat the label. Add information the label alone does not convey.
- Maximum 120 characters.

**Example:**

```
Label:   "Visibility"
Tooltip: "Controls whether this standard appears in team members' editors"
```

### Form Labels and Validation

**Principles:**
- Labels should be nouns or short noun phrases ("Package name", not "Enter the name of your package").
- Placeholder text should show format or example, not repeat the label.
- Validation messages should state the requirement, not the error ("Name is required" not "You forgot to enter a name").

**Example:**

```
Label:       "Package name"
Placeholder: "e.g., Frontend guidelines"
Validation:  "Name is required"
Validation:  "Name must be 100 characters or fewer"
```

### Loading States

**Principles:**
- Only add text to loading states when the wait may exceed 2-3 seconds.
- Use present participle: "Loading standards...", "Preparing your export..."
- Do not over-promise timing ("This will only take a moment").

### CLI Output Messages

CLI messages provide feedback to developers running commands in the terminal. They must be scannable and informative.

**Structure for progress/success:**
1. **Formatting prefix** - Use text formatting (capitalization, brackets, dashes) for visual scanning instead of emojis
2. **Action in past tense** - What was completed
3. **Object** - What was affected

**Structure for errors:**
1. **Error label** - Clearly mark as an error
2. **What failed** - Specific operation that did not succeed
3. **Why** (if known) - Root cause or context
4. **Recovery action** - What the user can do next

**Principles:**
- Keep messages to one line when possible.
- Use consistent punctuation: no period at the end of single-line messages.
- For multi-step operations, show progress with a consistent format.
- Error messages must include enough context to act on without re-reading documentation.
- Prefer text-based formatting (capitalization, brackets, indentation) over emojis for emphasis and visual hierarchy.

**Examples:**

```
Progress:  "Fetching available packages..."
Success:   "Package 'frontend' installed successfully"
Error:     "Error: Unable to connect to the Packmind API. Verify your API key with `packmind auth status`"
Warning:   "Warning: 2 standards were skipped — they already exist in the target package"
```

### CTAs and Button Labels

**Principles:**
- Start with a verb: "Create", "Add", "Export", "Invite".
- Be specific only when the surrounding context does not already clarify the object. For example, on a "Packages" page, "Create" is sufficient — "Create package" would be redundant. On a page with mixed content types, "Create package" is necessary for clarity.
- Limit to 3 words when possible.
- Avoid generic labels like "Submit", "OK", or "Click here".

## Applying This Skill

When writing or reviewing user-facing text in frontend components:

1. Identify the copy type (blank state, error, confirmation, etc.).
2. Follow the corresponding structure and principles above.
3. Verify terminology compliance (no "recipes", consistent product terms).
4. Check that the copy is concise, actionable, and uses formal tone.
5. When multiple strings are needed (e.g., a full dialog), provide all parts as a cohesive set.
