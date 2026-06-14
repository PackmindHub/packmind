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
