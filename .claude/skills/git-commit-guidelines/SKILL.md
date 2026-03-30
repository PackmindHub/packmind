---
name: 'git-commit-guidelines'
description: 'Enforce git commit best practices using gitmoji + Conventional Commits format. TRIGGER when creating commits. Ensures quality-gate passes, prevents issue auto-closing (no Close/Fix keywords), includes Co-Authored-By for AI commits, and requires user approval before committing.'
---

# Git Commit Guidelines

This skill enforces git commit best practices for the Packmind project, combining gitmoji for visual commit type identification with Conventional Commits format.

## TRIGGER CHECKLIST - Read This First

**TRIGGER THIS SKILL WHEN:**

- [ ] User asks you to commit changes
- [ ] User asks you to create a commit
- [ ] You are about to run `git commit`
- [ ] User says "commit this" or similar

**TRIGGER IMMEDIATELY** - before running any git commit command.

## Failure Examples - What NOT To Do

### Failure 1: Committing Without User Permission

```
User: "Fix the bug in the login function"

AI: [Fixes the bug]
AI: [Runs git commit directly without asking] ❌

CORRECT BEHAVIOR:
AI: [Fixes the bug]
AI: [Asks user: "Ready to commit. Here's the proposed message: ..."]
AI: [Waits for user approval]
AI: [Then commits]
```

### Failure 2: Using Close/Fix Before Issue References

```
AI: git commit -m "Fix login bug

Closes #123" ❌

CORRECT BEHAVIOR:
AI: git commit -m "Fix login bug

#123" ✓
```

### Failure 3: Skipping Quality Gate

```
AI: [Makes changes]
AI: [Commits immediately without running quality-gate] ❌

CORRECT BEHAVIOR:
AI: [Makes changes]
AI: [Runs npm run quality-gate]
AI: [Fixes any issues]
AI: [Then proposes commit]
```

### Failure 4: Missing Gitmoji

```
AI: git commit -m "feat(auth): add login validation" ❌

CORRECT BEHAVIOR:
AI: git commit -m "✨ feat(auth): add login validation" ✓
```

## Commit Message Format

```
<gitmoji> <type>(<scope>): <subject>

<body>

<issue-reference>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Format Rules

| Element             | Rule                                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| **Language**        | Required. All commit messages MUST be written in English                                            |
| **Gitmoji**         | Required. Must match the commit type                                                                |
| **Type**            | Required. One of: feat, fix, refactor, docs, test, chore, style, perf, security, remove, move, deps |
| **Scope**           | Optional. Component or module affected (e.g., auth, api, ui)                                        |
| **Subject**         | Required. Imperative mood, no period, max 72 chars                                                  |
| **Body**            | Optional. Bullet points with `-` prefix for multiple changes                                        |
| **Issue Reference** | Optional. Use `#123` format. NEVER prefix with "Close", "Fix", or "Resolve"                         |
| **Co-Author**       | Required for AI-assisted commits                                                                    |

## Gitmoji Reference Table

| Gitmoji | Type     | Description             | Example                                      |
| ------- | -------- | ----------------------- | -------------------------------------------- |
| ✨      | feat     | New feature             | `✨ feat(auth): add OAuth2 support`          |
| 🐛      | fix      | Bug fix                 | `🐛 fix(api): handle null response`          |
| ♻️      | refactor | Code refactoring        | `♻️ refactor(core): extract helper function` |
| 📝      | docs     | Documentation           | `📝 docs: update API reference`              |
| ✅      | test     | Adding/updating tests   | `✅ test(auth): add login tests`             |
| 🔧      | chore    | Maintenance tasks       | `🔧 chore: update dependencies`              |
| 🎨      | style    | Code formatting         | `🎨 style: apply prettier formatting`        |
| ⚡️      | perf     | Performance improvement | `⚡️ perf(query): optimize database calls`    |
| 🔒️      | security | Security fix            | `🔒️ security: sanitize user input`           |
| 🗑️      | remove   | Removing code/files     | `🗑️ remove: delete deprecated endpoint`      |
| 🚚      | move     | Moving/renaming files   | `🚚 move: relocate utils to shared`          |
| 📦      | deps     | Dependencies            | `📦 deps: upgrade React to v19`              |

## 7-Step Commit Workflow

### Step 1: Complete Work

Ensure all changes are complete and the feature/fix is working.

### Step 2: Run Quality Gate

```bash
npm run quality-gate
```

**MANDATORY**: This must pass before committing. Fix any issues found.

### Step 3: Review Changes

Run these commands to understand what will be committed:

```bash
git status
git diff --staged
```

If changes aren't staged, stage them first:

```bash
git add <files>
```

### Step 4: Prepare Commit Message

Compose the commit message following the format above:

1. Choose the appropriate gitmoji based on the change type
2. Write a clear subject line in imperative mood
3. Add body with bullet points if multiple changes
4. Include issue reference WITHOUT "Close/Fix/Resolve" prefix
5. Add Co-Authored-By footer

### Step 5: Ask User for Permission (MANDATORY)

**NEVER skip this step.** Present the commit to the user:

> Ready to commit. Here's the proposed message:
>
> ```
> <full commit message>
> ```
>
> Do you want me to proceed with this commit?

Wait for explicit user approval.

### Step 6: Create Commit

Use HEREDOC format to preserve formatting:

```bash
git commit -m "$(cat <<'EOF'
✨ feat(scope): subject line here

- First change description
- Second change description

#123

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

**NEVER use `--no-verify`**

### Step 7: Verify Commit

After committing, verify it was successful:

```bash
git log -1 --pretty=format:"%h %s"
git status
```

## Example Scenarios

### Example 1: Simple Bug Fix

```
✨ Staged changes: Fixed null check in user service

✅ Commit message:
🐛 fix(user): handle null user in getProfile

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Example 2: New Feature with Issue Reference

```
✨ Staged changes: Added export functionality to reports

✅ Commit message:
✨ feat(reports): add CSV export functionality

- Add export button to report toolbar
- Implement CSV generation service
- Add download trigger

#456

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Example 3: Refactoring with Multiple Changes

```
✨ Staged changes: Refactored authentication module

✅ Commit message:
♻️ refactor(auth): extract token validation logic

- Move validation to dedicated service
- Add unit tests for edge cases
- Update imports across modules

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Example 4: Documentation Update

```
✨ Staged changes: Updated README with new setup instructions

✅ Commit message:
📝 docs: update installation instructions

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Example 5: Test Addition

```
✨ Staged changes: Added tests for payment service

✅ Commit message:
✅ test(payment): add unit tests for refund flow

- Test successful refund scenario
- Test partial refund handling
- Test refund validation errors

#789

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Example 6: Dependency Update

```
✨ Staged changes: Upgraded TypeScript to v5.3

✅ Commit message:
📦 deps: upgrade TypeScript to 5.3

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Example 7: File Move/Rename

```
✨ Staged changes: Moved utility functions to shared package

✅ Commit message:
🚚 move: relocate date utils to shared package

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Example 8: Security Fix

```
✨ Staged changes: Fixed XSS vulnerability in comment input

✅ Commit message:
🔒️ security(comments): sanitize HTML in user input

#security-audit

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

## Important Guidelines

### DO

- ✅ Always write commit messages in English
- ✅ Always run `npm run quality-gate` before committing
- ✅ Always ask for user permission before committing
- ✅ Always use gitmoji matching the commit type
- ✅ Always include `Co-Authored-By` for AI-assisted commits
- ✅ Always verify the commit was successful with `git log -1`
- ✅ Use imperative mood in subject line ("add" not "added")
- ✅ Keep subject line under 72 characters
- ✅ Use bullet points with `-` for multi-line bodies
- ✅ Reference issues with just `#123` format

### DO NOT

- ❌ Never write commit messages in languages other than English (e.g., French, Spanish, etc.)
- ❌ Never commit without user approval
- ❌ Never use `--no-verify` flag
- ❌ Never use "Close", "Fix", or "Resolve" before issue numbers
- ❌ Never skip quality-gate check
- ❌ Never use `git commit --amend` unless explicitly requested
- ❌ Never force push to main/master
- ❌ Never commit files containing secrets (.env, credentials.json)
- ❌ Never forget the gitmoji prefix
- ❌ Never use past tense in subject ("fixed" → "fix")

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                  GIT COMMIT QUICK REFERENCE                 │
├─────────────────────────────────────────────────────────────┤
│ FORMAT:                                                     │
│   <gitmoji> <type>(<scope>): <subject>                      │
│                                                             │
│ GITMOJI:                                                    │
│   ✨ feat    🐛 fix     ♻️ refactor   📝 docs               │
│   ✅ test    🔧 chore   🎨 style      ⚡️ perf               │
│   🔒️ security  🗑️ remove  🚚 move    📦 deps               │
│                                                             │
│ WORKFLOW:                                                   │
│   1. npm run quality-gate                                   │
│   2. git status && git diff --staged                        │
│   3. Prepare message with gitmoji                           │
│   4. ASK USER PERMISSION                                    │
│   5. git commit (use HEREDOC)                               │
│   6. git log -1 (verify)                                    │
│                                                             │
│ RULES:                                                      │
│   • Always write in English                                 │
│   • Always ask permission before committing                 │
│   • Never use Close/Fix/Resolve before #issue               │
│   • Never use --no-verify                                   │
│   • Always include Co-Authored-By footer                    │
└─────────────────────────────────────────────────────────────┘
```

---

**REMEMBER:** This skill is MANDATORY when creating commits. Always run quality-gate, always ask for permission, and always use gitmoji. These steps ensure code quality and maintain a clean, informative git history.