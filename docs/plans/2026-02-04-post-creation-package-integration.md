# Post-Creation Package Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a final step to create-standard, create-command, and create-skill skills that offers to add the newly created item to a relevant package.

**Architecture:** Each skill gets a new final step that: (1) lists packages, (2) uses semantic matching to find best fit, (3) offers to add item to package if match found, (4) silently skips if no match.

**Tech Stack:** Markdown skill files, packmind-cli commands

---

## Task 1: Update create-standard skill

**Files:**
- Modify: `.github/skills/create-standard/SKILL.md` (after line 324, before "## Complete Example")

**Step 1: Read the current file to confirm insertion point**

Run: `head -330 .github/skills/create-standard/SKILL.md | tail -15`
Expected: Shows "Step 6: Iterate and Improve" section ending around line 324

**Step 2: Add new Step 7 section**

Insert after line 324 (after "To add rules to an existing standard, use the Packmind UI or API."):

```markdown

### Step 7: Offer to Add to Package

After successful creation, check if the standard fits an existing package:

1. Run `packmind-cli install --list` to get available packages
2. If no packages exist, skip this step silently and end the workflow
3. Analyze the created standard's name, description, and scope against each package's name and description
4. If a package is a clear semantic fit (the standard's domain/technology aligns with the package's purpose):
   - Present to user: "This standard seems to fit the `<package-slug>` package."
   - Offer three options:
     - Add to `<package-slug>`
     - Choose a different package
     - Skip
5. If no clear fit is found, skip silently (do not mention packages)
6. If user chooses to add:
   - Run: `packmind-cli packages add --to <package-slug> --standard <standard-slug>`
   - Ask: "Would you like me to run `packmind-cli install` to sync the changes?"
   - If yes, run: `packmind-cli install`
```

**Step 3: Verify the edit**

Run: `grep -n "Step 7: Offer to Add to Package" .github/skills/create-standard/SKILL.md`
Expected: Shows the line number where Step 7 was added

**Step 4: Commit**

```bash
git add .github/skills/create-standard/SKILL.md
git commit -m "feat(skills): add package integration step to create-standard

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Update packmind-create-command skill

**Files:**
- Modify: `.github/skills/packmind-create-command/SKILL.md` (after line 221, before "## Complete Example")

**Step 1: Read the current file to confirm insertion point**

Run: `head -225 .github/skills/packmind-create-command/SKILL.md | tail -10`
Expected: Shows troubleshooting section ending around line 221

**Step 2: Add new Step 6 section**

Insert after line 221 (after "Check that all arrays have at least one entry"):

```markdown

### Step 6: Offer to Add to Package

After successful creation, check if the command fits an existing package:

1. Run `packmind-cli install --list` to get available packages
2. If no packages exist, skip this step silently and end the workflow
3. Analyze the created command's name and summary against each package's name and description
4. If a package is a clear semantic fit (the command's domain/technology aligns with the package's purpose):
   - Present to user: "This command seems to fit the `<package-slug>` package."
   - Offer three options:
     - Add to `<package-slug>`
     - Choose a different package
     - Skip
5. If no clear fit is found, skip silently (do not mention packages)
6. If user chooses to add:
   - Run: `packmind-cli packages add --to <package-slug> --command <command-slug>`
   - Ask: "Would you like me to run `packmind-cli install` to sync the changes?"
   - If yes, run: `packmind-cli install`
```

**Step 3: Verify the edit**

Run: `grep -n "Step 6: Offer to Add to Package" .github/skills/packmind-create-command/SKILL.md`
Expected: Shows the line number where Step 6 was added

**Step 4: Commit**

```bash
git add .github/skills/packmind-create-command/SKILL.md
git commit -m "feat(skills): add package integration step to packmind-create-command

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Update packmind-create-skill skill

**Files:**
- Modify: `.github/skills/packmind-create-skill/SKILL.md` (after line 249, at end of file)

**Step 1: Read the current file to confirm insertion point**

Run: `tail -20 .github/skills/packmind-create-skill/SKILL.md`
Expected: Shows Step 7 "Distributing a Skill" ending around line 249-250

**Step 2: Add new Step 8 section**

Insert after line 249 (after "The skill creation process is not complete until this command has been executed successfully."):

```markdown

### Step 8: Offer to Add to Package

After successful distribution, check if the skill fits an existing package:

1. Run `packmind-cli install --list` to get available packages
2. If no packages exist, skip this step silently and end the workflow
3. Analyze the created skill's name and description against each package's name and description
4. If a package is a clear semantic fit (the skill's domain/technology aligns with the package's purpose):
   - Present to user: "This skill seems to fit the `<package-slug>` package."
   - Offer three options:
     - Add to `<package-slug>`
     - Choose a different package
     - Skip
5. If no clear fit is found, skip silently (do not mention packages)
6. If user chooses to add:
   - Run: `packmind-cli packages add --to <package-slug> --skill <skill-slug>`
   - Ask: "Would you like me to run `packmind-cli install` to sync the changes?"
   - If yes, run: `packmind-cli install`
```

**Step 3: Verify the edit**

Run: `grep -n "Step 8: Offer to Add to Package" .github/skills/packmind-create-skill/SKILL.md`
Expected: Shows the line number where Step 8 was added

**Step 4: Commit**

```bash
git add .github/skills/packmind-create-skill/SKILL.md
git commit -m "feat(skills): add package integration step to packmind-create-skill

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Final Validation

**Step 1: Verify all three skills have the new step**

Run:
```bash
echo "=== create-standard ===" && grep -c "Offer to Add to Package" .github/skills/create-standard/SKILL.md
echo "=== packmind-create-command ===" && grep -c "Offer to Add to Package" .github/skills/packmind-create-command/SKILL.md
echo "=== packmind-create-skill ===" && grep -c "Offer to Add to Package" .github/skills/packmind-create-skill/SKILL.md
```
Expected: Each shows "1"

**Step 2: Verify step numbering is correct**

Run:
```bash
grep -E "^### Step [0-9]+:" .github/skills/create-standard/SKILL.md | tail -3
grep -E "^### Step [0-9]+:" .github/skills/packmind-create-command/SKILL.md | tail -3
grep -E "^### Step [0-9]+:" .github/skills/packmind-create-skill/SKILL.md | tail -3
```
Expected:
- create-standard: Steps 5, 6, 7
- packmind-create-command: Steps 4, 5, 6
- packmind-create-skill: Steps 6, 7, 8

**Step 3: Report completion**

All three skill files have been updated with the package integration step.
