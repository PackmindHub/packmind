# Michel — Learnings Log

Retrospectives appended across Michel runs. Each run appends a new section; duplicates across runs are acceptable.

## Issue #357 — Support Claude Skill frontmatter `disallowed-tools`

### Technical difficulties

- Pre-push hook surfaced a pre-existing `PackmindIgnoreReader.spec.ts` failure: `chmod 0o000` is a no-op when running as root, so the test for "unreadable file" always resolved instead of rejecting in the container. Required a defensive `it.skip` when `process.getuid() === 0` and an extra fix commit before push could succeed.
- Playwright MCP had a stale screencast state (`Screencast is already started`) at the start of the UI recording step; had to stop-and-restart before recording could begin.
- `playbook submit --no-verify` was tried first but the correct flag is `--no-review`; the wrong flag name came from an ambiguous mental model — the `--help` output resolved it but added a round-trip.

### Missing information

- The signup endpoint requires ≥2 non-alphanumeric characters in passwords but there is no client-side hint or documented requirement — discovered only from the `400` response body after the first attempt.
- The `docs/` and `videos/` top-level directories are gitignored (not obvious from the `.gitignore` without checking), so CLI SVGs and videos had to be redirected to `.agent/artifacts/` mid-recording flow.

### Harness improvement ideas

- Add a root-guard helper (e.g. `skipWhenRoot()`) to the shared test utilities so tests that rely on `chmod` don't need ad-hoc `it.skip` fixes in every Michel run.
- The `michel-run-local-dev-stack` skill should document the demo-user password requirement (≥2 special chars) so auth setup scripts work on the first attempt.
- Document in project context (or in the CLI help scaffold) that the submit flag is `--no-review` not `--no-verify`, since the latter is the conventional Git flag and causes an immediate but non-obvious error.

## Issue #345 — Upgrade Node, NX and Vite

### Technical difficulties

- The autosquash step used a stray `--root` flag (`git rebase --autosquash --root`), which started replaying the entire branch history and hit an old, unrelated conflict. Recovered with `git rebase --abort` and re-ran with a bounded base (`<sha>~1`), but this cost a full recovery cycle. Autosquashing a fixup onto a recent commit should always use a bounded base, never `--root`.
- Plain `git rebase --autosquash <base>` (non-interactive) silently did NOT fold the fixup commit; it only worked with `-i` plus `GIT_SEQUENCE_EDITOR=true GIT_EDITOR=true`. Non-interactive autosquash is unreliable — go straight to the `-i` + no-op-editor form.
- `pnpm install` after the Nx 23 major migration exceeded the 2-minute Bash timeout (network fetch of new dep tree). Had to re-run it backgrounded with a `until grep -q EXIT= ...` poll loop. Backgrounding large installs from the start avoids the wasted timed-out attempt.
- `python3` is not available in this environment; a JSON-parsing one-liner failed with exit 127. Use `node -e '...'` for ad-hoc scripting here.
- Writing `.nvmrc` failed once with "File has not been read yet" — the Write tool requires a prior Read even for a trivial one-line overwrite.

### Missing information

- The assessment/plan file map listed the canonical Node-version files but MISSED `CONTRIBUTING.md:5`, which pins the required contributor Node version. Found only via a final `git grep "24\.15\.0"` sweep. A version-upgrade plan should enumerate CONTRIBUTING/docs references, not just config/CI files.
- It was non-obvious which `24.15.0` occurrences to leave alone: `scripts/michel/docker-compose*.override*` (agent sandbox tooling, forbidden to patch), `migrate_node24.sh`, and `pnpm-lock.yaml` legacy entries are intentional drift. A note in project context listing "version strings that must NOT be bumped" would prevent an exploration pass.

### Harness improvement ideas

- Add to project context: for dependency/runtime upgrades, always run `git grep` for the old version string as a final completeness check, and treat `scripts/michel/*` overrides as off-limits.
- Provide a documented helper or standard snippet for "fold a fixup into an earlier commit" (the `-i --autosquash` + no-op editor incantation), since the naive forms silently fail or over-reach.
- Note in context that `python3` is absent — prefer `node -e` for scripting.
