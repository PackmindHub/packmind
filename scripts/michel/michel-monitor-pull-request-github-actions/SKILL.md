---
name: michel-monitor-pull-request-github-actions
description: Diagnose a failed, stuck, or never-triggered CI run on a GitHub PR, apply a local fix if possible, push it, and document the result in a single running PR comment. Invoke whenever Michel's CI monitor loop triggers with `any_failure`, `stuck`, or `not_triggered` — the bash loop already handles `pending` and `all_green` silently, so this skill never sees those states.
---

# Monitor a pull request's GitHub Actions CI

Called during one iteration of the CI monitor loop. The harness prompt already contains everything needed to start:

- `{{CHECKS_JSON}}` — snapshot of all check statuses at loop entry
- `{{REASON}}` — `any_failure`, `stuck`, or `not_triggered`
- `{{PR_NUMBER}}`, `{{BRANCH}}`, `{{WORKDIR}}`, `{{ITER}}`, `{{MAX_ITER}}`

## Decision flow

```
Read CHECKS_JSON in prompt
  → if REASON == "stuck":          document timeout in running comment → done
  → if REASON == "not_triggered":  investigate why CI never started, document → done
  → if REASON == "any_failure":
      1. Identify failing run(s) via gh run list
      2. Fetch failed logs with gh run view --log-failed
      3. Match pattern → apply fix locally
      4. Commit + push
      5. Create or update running comment
      (if unfixable: document reason → done, no push)
```

## 1. Classify — `any_failure` vs `stuck`

The bash outer loop has already classified the state; you are invoked only in these two cases:

| `{{REASON}}`    | Meaning                                                                                            | Action                                                            |
| --------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `any_failure`   | At least one completed check has `conclusion` ∈ `{failure, timed_out, cancelled, action_required}` | Diagnose and fix (sections 2–3)                                   |
| `stuck`         | A workflow **started** but has been in-progress for >20 min                                        | Document timeout in running comment (section 5) — no code changes |
| `not_triggered` | Zero checks **ever** registered for the whole monitoring window — CI never started                 | Investigate why (section 5) and document — no code changes        |

`conclusion` values to recognise: `success` / `failure` / `timed_out` / `cancelled` / `action_required` / `neutral` / `skipped` / `stale` / `null`.

A `completed` check with `conclusion = null` counts as failure.

### gh CLI contract — re-fetch with `gh run list`, NOT `gh pr checks`

Do **not** use `gh pr checks` here. It resolves the commit's `statusCheckRollup`
over GraphQL, and the worker's **fine-grained PAT has no permission that can read
the Checks API** (check-runs). It always partial-fails with `Resource not
accessible by personal access token (…statusCheckRollup.contexts.nodes.N)`,
returns an empty body, and makes a healthy PR look like zero checks — the bug that
produced false `not_triggered` loops. There is no fine-grained permission that
fixes this; only a classic PAT (`repo` scope) or a GitHub App can read check-runs.

Re-fetch CI state with `gh run list` instead — it hits `GET /actions/runs`
(`Actions:read`, which the token has) and reports each workflow run's `status` and
`conclusion` directly, no GraphQL:

```bash
gh run list --branch <BRANCH> --repo <OWNER/REPO> \
  --json databaseId,status,conclusion,workflowName,startedAt,headSha --limit 50
```

Classify only the runs whose `.headSha` equals the PR head commit
(`gh pr view <PR_NUMBER> --repo <OWNER/REPO> --json headRefOid --jq .headRefOid`);
runs on the branch with a different SHA are stale from earlier pushes.

| run state                                                                                            | meaning |
| ---------------------------------------------------------------------------------------------------- | ------- |
| `status != "completed"`                                                                              | pending |
| completed + `conclusion` ∈ `{success, neutral, skipped}`                                             | pass    |
| completed + `conclusion` ∈ `{failure, timed_out, cancelled, action_required, startup_failure, null}` | fail    |

## 2. Diagnose a failure

### Step 1 — Start from the snapshot

Read `{{CHECKS_JSON}}` in the prompt first — it is the snapshot of the head commit's runs (`name`, `status`, `conclusion`, `bucket`) at loop entry. Only re-fetch if you need data fresher than the snapshot, and use `gh run list` to do it (see the gh CLI contract above) — never `gh pr checks`, which the fine-grained PAT cannot read.

### Step 2 — Find the failing run

```bash
gh run list --branch <BRANCH> --repo <OWNER/REPO> \
  --json databaseId,name,status,conclusion,workflowName,url \
  --limit 10 | jq '.[] | select(.conclusion == "failure")'
```

### Step 3 — Read failed step logs

```bash
gh run view <RUN_ID> --repo <OWNER/REPO> --log-failed
```

`--log-failed` returns only the failing steps' output — much smaller than full logs.

### Step 4 — Get job/step names if needed

```bash
gh run view <RUN_ID> --repo <OWNER/REPO> --json jobs
```

### Step 5 — Match the root cause

| Log pattern                | Likely cause                   | Fix                                               |
| -------------------------- | ------------------------------ | ------------------------------------------------- |
| ESLint / Lint errors       | Code violates ESLint rules     | Fix the lint errors in the affected files         |
| Jest / test failure        | Assertion failed or file error | Fix the test or the production code it covers     |
| TypeScript / tsc error     | Type mismatch, bad import      | Fix the type error in the source                  |
| Build error (nx build)     | Missing dep, bad import path   | Fix import or tsconfig                            |
| Missing secret / env var   | Required CI env not set        | Document as unfixable — you cannot add CI secrets |
| Repeated identical failure | Same error as prior iteration  | Document as unfixable — cycling wastes iterations |

**Detecting a repeated failure:** fetch the running comment body, scan for the previous iteration's `**Failure:**` and `**Cause:**` lines, and compare their error signature to the current run's log output. If the signatures match, declare unfixable rather than pushing another identical attempt.

## 3. Apply a fix and push

### Edit and commit

```bash
git -C <WORKDIR> add <changed-files>
git -C <WORKDIR> commit -m "🐛 fix(ci): <short description>"
```

You do not need to run `nx test` or `nx lint` by hand before pushing — the pre-push hook runs `nx affected` automatically on push, and CI re-runs the full gate on the PR. If the hook fails, fix what it reports and push again.

### Push

```bash
git push -u origin <BRANCH> --force-with-lease
```

`--force-with-lease` only overwrites the remote tip if it matches the last-known ref, so it is safe for force-push. The pre-push hook (`nx affected`) runs as the local gate before the push; CI re-runs the full gate on the PR as the authoritative check.

## 4. Single running PR comment

There is exactly one running comment per PR, identified by `<!-- michel-ci-monitor -->`. Posting a second comment fragments the history and makes the PR timeline hard to follow — always find the existing one and patch it in place.

### Look up the comment ID

```bash
gh api --paginate "repos/<OWNER>/<REPO>/issues/<PR_NUMBER>/comments" \
  --jq '[.[] | select(.body | contains("<!-- michel-ci-monitor -->"))] | first | .id'
```

`--paginate` ensures the comment is found even if the PR has more than 30 comments.

### Create the comment (first failure, no comment exists yet)

```bash
gh pr comment <PR_NUMBER> --repo <OWNER>/<REPO> --body "$(cat <<'BODY'
<!-- michel-ci-monitor -->
## Michel — CI Monitor

### Iteration 1

**Failure:** <workflow / job / step>
**Cause:** <1-2 sentences>
**Fix applied:** <what was changed and why>
**Commit:** <git sha>
BODY
)"
```

### Update the comment (subsequent iterations)

Write the new body to a tempfile to avoid shell-quoting issues with `$`, backticks, or multi-line content:

```bash
COMMENT_ID=$(gh api --paginate "repos/<OWNER>/<REPO>/issues/<PR_NUMBER>/comments" \
  --jq '[.[] | select(.body | contains("<!-- michel-ci-monitor -->"))] | first | .id')

EXISTING=$(gh api "repos/<OWNER>/<REPO>/issues/comments/${COMMENT_ID}" --jq '.body')

cat > /tmp/comment-body.md <<BODY
${EXISTING}

### Iteration <N>

**Failure:** <details>
**Cause:** <details>
**Fix applied:** <details or 'Unfixable — see below'>
BODY

gh api -X PATCH "repos/<OWNER>/<REPO>/issues/comments/${COMMENT_ID}" \
  -F body=@/tmp/comment-body.md
```

**Comment body structure** — cumulative, one `### Iteration N` heading per invocation:

- What workflow / job / step failed
- Root cause (from the logs)
- Fix applied — or "Unfixable" with reason
- Git commit SHA if a fix was pushed

## 5. Terminal states — unfixable or timeout

When you cannot fix the problem or the workflow is stuck, update the running comment and return **without committing anything**.

**Unfixable:**

```
### Iteration <N> — Unfixable

**Failure:** <details>
**Reason not fixable:** <missing CI secret | repeated identical failure | infra issue | error outside codebase>
**Recommendation:** Manual intervention required.
```

**Timeout (stuck):**

```
### Timeout reached

Workflow **<name>** has been running for >20 minutes — likely a CI infrastructure issue, not a code problem.
No fix was attempted. Manual re-run or intervention may be needed.
```

**CI did not trigger (not_triggered):**

First confirm with `gh run list --branch <BRANCH> --repo <OWNER/REPO>` whether any
run exists. Zero runs ⇒ the workflow never started — most often no self-hosted
runner was available, a branch/path filter excluded the PR, or the run needs
approval.

```
### CI did not trigger

No checks registered for this PR within the monitoring window. CI did not start
— likely no self-hosted runner available, a branch/path filter, or a required run
approval. No fix was attempted. Verify runner availability / workflow triggers,
then re-run.
```
