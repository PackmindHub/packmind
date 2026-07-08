import {
  PMButton,
  PMCloseButton,
  PMDialog,
  PMHStack,
  PMIcon,
  PMPortal,
  PMTabs,
  PMTabsTrigger,
  PMTabsContent,
} from '@packmind/ui';
import {
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../../shared/components/editor/MarkdownEditor';
import { LuBook, LuExternalLink } from 'react-icons/lu';

interface SkillExample {
  title: string;
  buttonLabel: string;
  content: string;
}

interface SkillExampleWithTabs {
  title: string;
  buttonLabel: string;
  tabs: Array<{
    label: string;
    content: string;
  }>;
}

const USING_GIT_WORKTREES_EXAMPLE: SkillExample = {
  title: 'Using Git Worktrees',
  buttonLabel: 'Using Git worktrees',
  content: `
# Using Git Worktrees

## Overview

Git worktrees create isolated workspaces sharing the same repository, allowing work on multiple branches simultaneously without switching.

**Core principle:** Systematic directory selection + safety verification = reliable isolation.

**Announce at start:** "I'm using the using-git-worktrees skill to set up an isolated workspace."

## Directory Selection Process

Follow this priority order:

### 1. Check Existing Directories

\`\`\`bash
# Check in priority order
ls -d .worktrees 2>/dev/null     # Preferred (hidden)
ls -d worktrees 2>/dev/null      # Alternative
\`\`\`

**If found:** Use that directory. If both exist, \`.worktrees\` wins.

### 2. Check CLAUDE.md

\`\`\`bash
grep -i "worktree.*director" CLAUDE.md 2>/dev/null
\`\`\`

**If preference specified:** Use it without asking.

### 3. Ask User

If no directory exists and no CLAUDE.md preference:

\`\`\`
No worktree directory found. Where should I create worktrees?

1. .worktrees/ (project-local, hidden)
2. ~/.config/superpowers/worktrees/<project-name>/ (global location)

Which would you prefer?
\`\`\`

## Safety Verification

### For Project-Local Directories (.worktrees or worktrees)

**MUST verify directory is ignored before creating worktree:**

\`\`\`bash
# Check if directory is ignored (respects local, global, and system gitignore)
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
\`\`\`

**If NOT ignored:**

Per Jesse's rule "Fix broken things immediately":
1. Add appropriate line to .gitignore
2. Commit the change
3. Proceed with worktree creation

**Why critical:** Prevents accidentally committing worktree contents to repository.

### For Global Directory (~/.config/superpowers/worktrees)

No .gitignore verification needed - outside project entirely.

## Creation Steps

### 1. Detect Project Name

\`\`\`bash
project=$(basename "$(git rev-parse --show-toplevel)")
\`\`\`

### 2. Create Worktree

\`\`\`bash
# Determine full path
case $LOCATION in
  .worktrees|worktrees)
    path="$LOCATION/$BRANCH_NAME"
    ;;
  ~/.config/superpowers/worktrees/*)
    path="~/.config/superpowers/worktrees/$project/$BRANCH_NAME"
    ;;
esac

# Create worktree with new branch
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
\`\`\`

### 3. Run Project Setup

Auto-detect and run appropriate setup:

\`\`\`bash
# Node.js
if [ -f package.json ]; then npm install; fi

# Rust
if [ -f Cargo.toml ]; then cargo build; fi

# Python
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi

# Go
if [ -f go.mod ]; then go mod download; fi
\`\`\`

### 4. Verify Clean Baseline

Run tests to ensure worktree starts clean:

\`\`\`bash
# Examples - use project-appropriate command
npm test
cargo test
pytest
go test ./...
\`\`\`

**If tests fail:** Report failures, ask whether to proceed or investigate.

**If tests pass:** Report ready.

### 5. Report Location

\`\`\`
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
\`\`\`

## Quick Reference

| Situation | Action |
|-----------|--------|
| \`.worktrees/\` exists | Use it (verify ignored) |
| \`worktrees/\` exists | Use it (verify ignored) |
| Both exist | Use \`.worktrees/\` |
| Neither exists | Check CLAUDE.md → Ask user |
| Directory not ignored | Add to .gitignore + commit |
| Tests fail during baseline | Report failures + ask |
| No package.json/Cargo.toml | Skip dependency install |

## Common Mistakes

### Skipping ignore verification

- **Problem:** Worktree contents get tracked, pollute git status
- **Fix:** Always use \`git check-ignore\` before creating project-local worktree

### Assuming directory location

- **Problem:** Creates inconsistency, violates project conventions
- **Fix:** Follow priority: existing > CLAUDE.md > ask

### Proceeding with failing tests

- **Problem:** Can't distinguish new bugs from pre-existing issues
- **Fix:** Report failures, get explicit permission to proceed

### Hardcoding setup commands

- **Problem:** Breaks on projects using different tools
- **Fix:** Auto-detect from project files (package.json, etc.)

## Example Workflow

\`\`\`
You: I'm using the using-git-worktrees skill to set up an isolated workspace.

[Check .worktrees/ - exists]
[Verify ignored - git check-ignore confirms .worktrees/ is ignored]
[Create worktree: git worktree add .worktrees/auth -b feature/auth]
[Run npm install]
[Run npm test - 47 passing]

Worktree ready at /Users/jesse/myproject/.worktrees/auth
Tests passing (47 tests, 0 failures)
Ready to implement auth feature
\`\`\`

## Red Flags

**Never:**
- Create worktree without verifying it's ignored (project-local)
- Skip baseline test verification
- Proceed with failing tests without asking
- Assume directory location when ambiguous
- Skip CLAUDE.md check

**Always:**
- Follow directory priority: existing > CLAUDE.md > ask
- Verify directory is ignored for project-local
- Auto-detect and run project setup
- Verify clean test baseline

## Integration

**Called by:**
- **brainstorming** (Phase 4) - REQUIRED when design is approved and implementation follows
- **subagent-driven-development** - REQUIRED before executing any tasks
- **executing-plans** - REQUIRED before executing any tasks
- Any skill needing isolated workspace

**Pairs with:**
- **finishing-a-development-branch** - REQUIRED for cleanup after work complete`,
};

const REQUESTING_CODE_REVIEW_EXAMPLE: SkillExampleWithTabs = {
  title: 'Requesting Code Review',
  buttonLabel: 'Requesting Code Review',
  tabs: [
    {
      label: 'SKILL.md',
      content: `# Requesting Code Review

Dispatch superpowers:code-reviewer subagent to catch issues before they cascade.

**Core principle:** Review early, review often.

## When to Request Review

**Mandatory:**
- After each task in subagent-driven development
- After completing major feature
- Before merge to main

**Optional but valuable:**
- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing complex bug

## How to Request

**1. Get git SHAs:**
\`\`\`bash
BASE_SHA=$(git rev-parse HEAD~1)  # or origin/main
HEAD_SHA=$(git rev-parse HEAD)
\`\`\`

**2. Dispatch code-reviewer subagent:**

Use Task tool with superpowers:code-reviewer type, fill template at \`code-reviewer.md\`

**Placeholders:**
- \`{WHAT_WAS_IMPLEMENTED}\` - What you just built
- \`{PLAN_OR_REQUIREMENTS}\` - What it should do
- \`{BASE_SHA}\` - Starting commit
- \`{HEAD_SHA}\` - Ending commit
- \`{DESCRIPTION}\` - Brief summary

**3. Act on feedback:**
- Fix Critical issues immediately
- Fix Important issues before proceeding
- Note Minor issues for later
- Push back if reviewer is wrong (with reasoning)

## Example

\`\`\`
[Just completed Task 2: Add verification function]

You: Let me request code review before proceeding.

BASE_SHA=$(git log --oneline | grep "Task 1" | head -1 | awk '{print $1}')
HEAD_SHA=$(git rev-parse HEAD)

[Dispatch superpowers:code-reviewer subagent]
  WHAT_WAS_IMPLEMENTED: Verification and repair functions for conversation index
  PLAN_OR_REQUIREMENTS: Task 2 from docs/plans/deployment-plan.md
  BASE_SHA: a7981ec
  HEAD_SHA: 3df7661
  DESCRIPTION: Added verifyIndex() and repairIndex() with 4 issue types

[Subagent returns]:
  Strengths: Clean architecture, real tests
  Issues:
    Important: Missing progress indicators
    Minor: Magic number (100) for reporting interval
  Assessment: Ready to proceed

You: [Fix progress indicators]
[Continue to Task 3]
\`\`\`

## Integration with Workflows

**Subagent-Driven Development:**
- Review after EACH task
- Catch issues before they compound
- Fix before moving to next task

**Executing Plans:**
- Review after each batch (3 tasks)
- Get feedback, apply, continue

**Ad-Hoc Development:**
- Review before merge
- Review when stuck

## Red Flags

**Never:**
- Skip review because "it's simple"
- Ignore Critical issues
- Proceed with unfixed Important issues
- Argue with valid technical feedback

**If reviewer wrong:**
- Push back with technical reasoning
- Show code/tests that prove it works
- Request clarification

See template at: requesting-code-review/code-reviewer.md`,
    },
    {
      label: 'code-reviewer.md',
      content: `# Code Review Agent

You are reviewing code changes for production readiness.

**Your task:**
1. Review {WHAT_WAS_IMPLEMENTED}
2. Compare against {PLAN_OR_REQUIREMENTS}
3. Check code quality, architecture, testing
4. Categorize issues by severity
5. Assess production readiness

## What Was Implemented

{DESCRIPTION}

## Requirements/Plan

{PLAN_REFERENCE}

## Git Range to Review

**Base:** {BASE_SHA}
**Head:** {HEAD_SHA}

\`\`\`bash
git diff --stat {BASE_SHA}..{HEAD_SHA}
git diff {BASE_SHA}..{HEAD_SHA}
\`\`\`

## Review Checklist

**Code Quality:**
- Clean separation of concerns?
- Proper error handling?
- Type safety (if applicable)?
- DRY principle followed?
- Edge cases handled?

**Architecture:**
- Sound design decisions?
- Scalability considerations?
- Performance implications?
- Security concerns?

**Testing:**
- Tests actually test logic (not mocks)?
- Edge cases covered?
- Integration tests where needed?
- All tests passing?

**Requirements:**
- All plan requirements met?
- Implementation matches spec?
- No scope creep?
- Breaking changes documented?

**Production Readiness:**
- Migration strategy (if schema changes)?
- Backward compatibility considered?
- Documentation complete?
- No obvious bugs?

## Output Format

### Strengths
[What's well done? Be specific.]

### Issues

#### Critical (Must Fix)
[Bugs, security issues, data loss risks, broken functionality]

#### Important (Should Fix)
[Architecture problems, missing features, poor error handling, test gaps]

#### Minor (Nice to Have)
[Code style, optimization opportunities, documentation improvements]

**For each issue:**
- File:line reference
- What's wrong
- Why it matters
- How to fix (if not obvious)

### Recommendations
[Improvements for code quality, architecture, or process]

### Assessment

**Ready to merge?** [Yes/No/With fixes]

**Reasoning:** [Technical assessment in 1-2 sentences]

## Critical Rules

**DO:**
- Categorize by actual severity (not everything is Critical)
- Be specific (file:line, not vague)
- Explain WHY issues matter
- Acknowledge strengths
- Give clear verdict

**DON'T:**
- Say "looks good" without checking
- Mark nitpicks as Critical
- Give feedback on code you didn't review
- Be vague ("improve error handling")
- Avoid giving a clear verdict

## Example Output

\`\`\`
### Strengths
- Clean database schema with proper migrations (db.ts:15-42)
- Comprehensive test coverage (18 tests, all edge cases)
- Good error handling with fallbacks (summarizer.ts:85-92)

### Issues

#### Important
1. **Missing help text in CLI wrapper**
   - File: index-conversations:1-31
   - Issue: No --help flag, users won't discover --concurrency
   - Fix: Add --help case with usage examples

2. **Date validation missing**
   - File: search.ts:25-27
   - Issue: Invalid dates silently return no results
   - Fix: Validate ISO format, throw error with example

#### Minor
1. **Progress indicators**
   - File: indexer.ts:130
   - Issue: No "X of Y" counter for long operations
   - Impact: Users don't know how long to wait

### Recommendations
- Add progress reporting for user experience
- Consider config file for excluded projects (portability)

### Assessment

**Ready to merge: With fixes**

**Reasoning:** Core implementation is solid with good architecture and tests. Important issues (help text, date validation) are easily fixed and don't affect core functionality.
\`\`\``,
    },
  ],
};

const SKILL_EXAMPLES = [USING_GIT_WORKTREES_EXAMPLE];
const SKILL_EXAMPLES_WITH_TABS = [REQUESTING_CODE_REVIEW_EXAMPLE];

interface SkillExampleDialogButtonProps {
  example: SkillExample;
}

const SkillExampleDialogButton = ({
  example,
}: SkillExampleDialogButtonProps) => {
  return (
    <PMDialog.Root
      size="xl"
      placement="center"
      motionPreset="slide-in-bottom"
      scrollBehavior="inside"
    >
      <PMDialog.Trigger asChild>
        <PMButton size="xs" variant="secondary" w="fit-content">
          <PMIcon>
            <LuBook />
          </PMIcon>{' '}
          Example: {example.buttonLabel}
        </PMButton>
      </PMDialog.Trigger>
      <PMPortal>
        <PMDialog.Backdrop />
        <PMDialog.Positioner>
          <PMDialog.Content>
            <PMDialog.Header>
              <PMDialog.Title>Skill Example: {example.title}</PMDialog.Title>
              <PMDialog.CloseTrigger asChild>
                <PMCloseButton />
              </PMDialog.CloseTrigger>
            </PMDialog.Header>
            <PMDialog.Body>
              <MarkdownEditorProvider>
                <MarkdownEditor
                  defaultValue={example.content}
                  readOnly
                  paddingVariant="none"
                />
              </MarkdownEditorProvider>
            </PMDialog.Body>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMPortal>
    </PMDialog.Root>
  );
};

interface SkillExampleWithTabsDialogButtonProps {
  example: SkillExampleWithTabs;
}

const SkillExampleWithTabsDialogButton = ({
  example,
}: SkillExampleWithTabsDialogButtonProps) => {
  return (
    <PMDialog.Root
      size="xl"
      placement="center"
      motionPreset="slide-in-bottom"
      scrollBehavior="inside"
    >
      <PMDialog.Trigger asChild>
        <PMButton size="xs" variant="secondary" w="fit-content">
          <PMIcon>
            <LuBook />
          </PMIcon>{' '}
          Example: {example.buttonLabel}
        </PMButton>
      </PMDialog.Trigger>
      <PMPortal>
        <PMDialog.Backdrop />
        <PMDialog.Positioner>
          <PMDialog.Content>
            <PMDialog.Header>
              <PMDialog.Title>Skill Example: {example.title}</PMDialog.Title>
              <PMDialog.CloseTrigger asChild>
                <PMCloseButton />
              </PMDialog.CloseTrigger>
            </PMDialog.Header>
            <PMDialog.Body>
              <PMTabs
                defaultValue={example.tabs[0].label}
                tabs={example.tabs.map((tab) => ({
                  value: tab.label,
                  triggerLabel: tab.label,
                  content: (
                    <MarkdownEditorProvider>
                      <MarkdownEditor
                        defaultValue={tab.content}
                        readOnly
                        paddingVariant="none"
                      />
                    </MarkdownEditorProvider>
                  ),
                }))}
              />
            </PMDialog.Body>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMPortal>
    </PMDialog.Root>
  );
};

export const SkillExampleDialog = () => {
  return (
    <PMHStack mt={4} gap={2}>
      {SKILL_EXAMPLES.map((example) => (
        <SkillExampleDialogButton key={example.title} example={example} />
      ))}
      {SKILL_EXAMPLES_WITH_TABS.map((example) => (
        <SkillExampleWithTabsDialogButton
          key={example.title}
          example={example}
        />
      ))}
      <PMButton variant="tertiary" size={'xs'} asChild w="fit-content">
        <a
          href="https://github.com/ComposioHQ/awesome-claude-skills/tree/master"
          target="_blank"
          rel="noopener noreferrer"
        >
          <PMIcon>
            <LuExternalLink />
          </PMIcon>
          Explore awesome-claude-skills
        </a>
      </PMButton>
    </PMHStack>
  );
};
