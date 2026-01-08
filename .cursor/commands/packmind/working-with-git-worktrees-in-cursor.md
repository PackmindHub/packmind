Enable parallel development on multiple branches simultaneously without switching contexts, with automatic setup and clean commit integration.

## When to Use

- Develop features in parallel without losing context or switching branches
- Test changes in one branch while continuing work in another
- Review pull requests locally while maintaining your current work
- Quickly test bug fixes on different branches without stashing changes
- Work on experimental changes without affecting your main development environment

## Context Validation Checkpoints

* [ ] Is Cursor configured with `.cursor/worktrees.json` for automatic setup?
* [ ] Do you have a clean main repository with no uncommitted changes?
* [ ] Are you ready to commit your worktree changes before integrating back to main?
* [ ] Do you want a linear git history (no merge commits)?

## Recipe Steps

### Step 1: Create and Setup Worktree

**With agents that support worktrees** (e.g., Cursor): Worktree creation and setup is automatic. The agent reads `.cursor/worktrees.json` and runs setup commands automatically.

**Manual setup**: Create the worktree and run the setup commands defined in `.cursor/worktrees.json`.

```bash
# Create worktree
git worktree add /path/to/worktree branch-name

# In worktree directory, run setup commands:
MAIN_WORKTREE=$(git worktree list --porcelain | grep -m1 '^worktree' | cut -d' ' -f2) && cp "$MAIN_WORKTREE/.env" .env
npm install
npm run chakra:typegen
node scripts/select-tsconfig.mjs
```

### Step 2: Develop and Commit in Worktree

Work normally in the worktree—make changes, run tests, and commit following standard git conventions. The worktree shares the same git repository as your main workspace, so commits are immediately available to both.

```bash
# In worktree directory
git add .
git commit -m "✨ feat: your feature description

Co-authored-by: Cursor <cursor@packmind.com>"
```

### Step 3: Verify Commits in Main Repository

Before integrating, verify your commits exist in the main repository. Since worktrees share the same git database, your commits are already there—you just need to apply them to the main branch.

```bash
# In main repository
git log <worktree-branch-name> --oneline -5
```

### Step 4: Integrate Changes with Cherry-Pick

Use `git cherry-pick` to apply your commit(s) to main for a clean linear history without merge commits. This creates a single-branch history that's easier to read.

```bash
# In main repository, on main branch
git pull  # Update main first
git cherry-pick <commit-hash>  # Apply your commit
```

### Step 5: Clean Up Worktree

After successfully integrating changes, remove the worktree and optionally delete the branch to keep your workspace clean.

```bash
# Remove worktree directory
git worktree remove /path/to/worktree

# Delete branch (optional)
git branch -d <worktree-branch-name>
```

### Step 6: Alternative: Rebase for Multiple Commits

If you have multiple commits, use `git rebase` instead of cherry-picking each one individually.

```bash
# In main repository
git pull  # Update main first
git rebase <worktree-branch-name>  # Apply all commits linearly
```
