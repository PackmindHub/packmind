# Post-Creation Package Integration

## Overview

After a standard, command, or skill is successfully created via CLI, CoPilot will offer to add the item to a relevant package using smart semantic matching.

## Workflow

1. **Fetch existing packages** using `packmind-cli install --list`
2. **Infer the item's category** from its name, description, and scope
3. **Match against package names** to find the best fit
4. **Present recommendation** to user with three options:
   - Add to recommended package
   - Choose a different package
   - Skip (don't add to any package)
5. **If no match found**: Skip silently (do not mention packages)

This workflow is added as a new final step in each of the three create skills, after the item is successfully created.

## Category Inference Logic

CoPilot uses its natural language understanding to determine the best match - no hardcoded keyword lists.

The skill instructs CoPilot to:

1. **Read the created item's content** (name, description, scope/summary)
2. **Read the available packages** from CLI output (name, description, slug)
3. **Determine the best semantic match** using natural reasoning:
   - Does the item's domain/technology align with a package's purpose?
   - Would this item logically belong with other items in that package?
4. **If confident in a match** → recommend that package
5. **If no clear fit** → skip silently

Example reasoning CoPilot would perform:
> "This standard is about 'TypeScript Testing Conventions' for test files. The `testing` package exists and groups test-related content. This is a good fit."

## User Interaction Flow

### When a good match is found

```
✓ Standard "TypeScript Testing Conventions" created successfully

This standard seems to fit the `testing` package.
- Add to `testing`
- Choose a different package
- Skip
```

### When no good match is found

```
✓ Command "Setup Kubernetes Cluster" created successfully
```

*(No package mention - workflow ends)*

### After user chooses "Choose a different package"

```
Available packages:
- frontend: Frontend components and styling
- backend-api: Backend API patterns
- testing: Testing conventions

Which package?
```

### After adding to package

```
Added "TypeScript Testing Conventions" to `testing`

Would you like to run `packmind-cli install` to sync changes?
```

## Skill File Changes

Each of the three skills gets a new final step added after successful creation.

### Files to modify

- `.github/skills/create-standard/SKILL.md`
- `.github/skills/packmind-create-command/SKILL.md`
- `.github/skills/packmind-create-skill/SKILL.md`

### New step to add

After the CLI creation step succeeds, add:

```markdown
### Step N: Offer to Add to Package

After successful creation, check if the item fits an existing package:

1. Run `packmind-cli install --list` to get available packages
2. If no packages exist, skip this step silently
3. Analyze the created item's name, description, and scope against package names/descriptions
4. If a package is a clear semantic fit:
   - Present: "This [standard/command/skill] seems to fit the `<package>` package."
   - Offer options: Add to suggested package / Choose different / Skip
5. If no clear fit, skip silently (do not mention packages)
6. If user chooses to add:
   - Run: `packmind-cli packages add --to <package> --[standard|command|skill] <slug>`
   - Ask: "Would you like to run `packmind-cli install` to sync changes?"
```

## Implementation Tasks

1. **Update create-standard skill** - Add package integration step after Step 5 (Verifying the Standard)
2. **Update packmind-create-command skill** - Add package integration step after Step 5 (Creating the Command via CLI)
3. **Update packmind-create-skill skill** - Add package integration step after Step 7 (Distributing a Skill)
