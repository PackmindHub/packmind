Relates to #357

## Summary

This PR adds `disallowed-tools` as a supported Claude Code skill frontmatter property. The field is registered in `CLAUDE_CODE_ADDITIONAL_FIELDS` (YAML key → camelCase storage key) and appended to `CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER` so it flows automatically through every existing consumer: the CLI parser, the backend storage, the Claude deployer emitter, and the frontend renderer — no changes needed in those files. The second issue bullet (Claude deployer not sorting additional properties) was already implemented before this PR; the `SkillMdContentBuilder` already calls `sortAdditionalPropertiesKeys` at line 52.

## Changes

- Added `'disallowed-tools': 'disallowedTools'` to `CLAUDE_CODE_ADDITIONAL_FIELDS` in `packages/types/src/skills/skillAdditionalProperties.ts`
- Appended `'disallowedTools'` to `CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER` in the same file
- Updated the strict `toEqual` assertion on `CAMEL_TO_YAML_KEY` in `packages/types/src/skills/skillAdditionalProperties.spec.ts` to include the new entry
- Added a `sortAdditionalPropertiesKeys` test case verifying `disallowedTools` sorts after `shell` in canonical order
- Created `.claude/skills/create-em-spec/SKILL.md` with `disallowed-tools: [Monitor, AskUserQuestions]` for the end-to-end demo

## How to verify

1. Build the CLI: `npm run packmind-cli:build`
2. Start the dev stack: `PACKMIND_EDITION=oss docker compose --profile dev up -d` and wait for `until curl -sf localhost:4200/api/v0 >/dev/null; do sleep 1; done`
3. Add the skill: `node ./dist/apps/cli/main.cjs playbook add .claude/skills/create-em-spec` — should succeed with no errors
4. Submit: `node ./dist/apps/cli/main.cjs playbook submit --no-verify` — should succeed with no errors
5. Open the Packmind UI at `http://localhost:4200`, navigate to the skill page for `create-em-spec`, and confirm the frontmatter section shows a `disallowed-tools` row with values `Monitor` and `AskUserQuestions`

## Testing

- `./node_modules/.bin/nx test types --testTimeout=30000` — 248 tests pass (includes the new `CAMEL_TO_YAML_KEY` strict-equality and `sortAdditionalPropertiesKeys` test cases)
- `./node_modules/.bin/nx test coding-agent --testTimeout=30000` — 1079 tests pass (covers `SkillMdContentBuilder` round-trip)
- `./node_modules/.bin/nx test node-utils --testTimeout=30000` — 310 tests pass (covers `parseSkillMd` which exercises `CLAUDE_CODE_ADDITIONAL_FIELDS`)
- `./node_modules/.bin/nx test skills --testTimeout=30000` — 302 tests pass (covers `SkillParser`)

## Notes for reviewer

The `packmind-cli` test suite has one pre-existing failure in `PackmindIgnoreReader.spec.ts` that tests `chmod 0o000` file permission denial — this test always fails when running as root (as in this sandbox), because root bypasses file permissions. The failure exists on the base branch before this PR and is unrelated to this change.

The second issue bullet ("Claude deployer emits additional properties without calling sortAdditionalPropertiesKeys") is stale: `SkillMdContentBuilder.ts` already imports and calls `sortAdditionalPropertiesKeys` at line 52. No code change was needed there.

## Artifacts

<!-- ARTIFACTS_PLACEHOLDER -->
