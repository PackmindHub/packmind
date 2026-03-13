# PR #201 Review: Feat/rename cli packmind

**Reviewer**: Claude (AI)
**PR**: https://github.com/PackmindHub/packmind/pull/201
**Author**: MaloPromyze
**Branch**: `feat/rename-cli-packmind` → `main`

---

## Summary

This PR renames the CLI binary from `packmind-cli` to `packmind` across 167 files (~920 additions, ~787 deletions). The change is comprehensive, touching CLI source code, documentation, CI/CD workflows, frontend components, MCP server tools, deployed skills, and test assertions. Backward compatibility is maintained via a deprecation warning and a symlink.

## Verdict: Approve with minor suggestions

The rename is well-executed and thorough. The backward compatibility strategy (dual bin entry + deprecation warning + install symlink) is solid. Below are specific observations and suggestions.

---

## What's done well

1. **Backward compatibility strategy** — Three-pronged approach:
   - Dual `bin` entry in `package.json` (`packmind` + `packmind-cli` → same `main.cjs`)
   - `checkDeprecatedBinaryName()` utility that detects invocation via the old name and warns
   - Install script creates a `packmind-cli → packmind` symlink

2. **Deprecation utility** (`apps/cli/src/infra/utils/deprecation.ts`) — Clean implementation using `path.win32.basename` for cross-platform support. Good test coverage including Unix, Windows `.cmd`, and dev-mode scenarios.

3. **Consistent renaming** — All user-facing strings (error messages, usage instructions, help text) have been updated across CLI handlers, frontend components, MCP tools, and deployed skills.

4. **Test updates** — All test assertions have been updated to match the new command names.

5. **Documentation** — Mintlify docs thoroughly updated, plus a new "Onboard Command" section added to `cli.mdx`.

6. **CI/CD** — Build artifacts, release assets, signing paths, and quality workflow all correctly updated. Homebrew dispatch event type kept as `packmind-cli-release` for external compatibility — good decision.

---

## Issues & Suggestions

### 1. Homebrew formula name mismatch (Medium)

**File**: `apps/doc/tools/cli.mdx`

The docs now instruct users to run `brew install packmind`, but the Homebrew tap likely still has the formula named `packmind-cli`. The dispatch event is still `packmind-cli-release`, which suggests the tap repo (`PackmindHub/homebrew-cli`) may not yet be updated.

**Suggestion**: Verify the Homebrew tap formula has been renamed, or keep the docs as `brew install packmind-cli` until the tap is updated. Otherwise users will get "formula not found" errors.

### 2. `brew upgrade` message may be premature (Low)

**File**: `apps/cli/src/infra/commands/updateHandler.ts:218`

The Homebrew upgrade message now says `brew upgrade packmind`, but this also depends on the tap being updated.

**Suggestion**: Same as above — coordinate with the Homebrew tap rename.

### 3. Release asset download URLs in `updateHandler.ts` (Low)

**File**: `apps/cli/src/infra/commands/updateHandler.ts:111`

The `downloadExecutable` function constructs URLs like:
```
https://github.com/PackmindHub/packmind/releases/download/release-cli/{version}/packmind-{platform}-{version}
```

This is correct for **new** releases, but existing releases have assets named `packmind-cli-*`. Users on older versions running `packmind-cli update` would try to download the new asset names from the new release — which should work since new releases will use the new names. However, this creates a one-way upgrade path which seems intentional.

**No action needed** — just flagging for awareness.

### 4. SonarCloud reports 0% coverage on new code (Info)

The `deprecation.ts` file has tests, but SonarCloud is showing 0% coverage on new code. This might be a coverage reporting configuration issue (e.g., test files not included in coverage collection).

**Suggestion**: Check if `deprecation.spec.ts` is being picked up by the Jest coverage configuration.

### 5. Consider `path.basename` instead of `path.win32.basename` (Nitpick)

**File**: `apps/cli/src/infra/utils/deprecation.ts:10`

Using `path.win32.basename` ensures Windows-style path separators are handled even on Unix. This is technically correct for cross-platform safety, but `path.basename` (platform-native) would also work since:
- On Windows, `path.basename` already handles `\` separators
- On Unix, `process.argv[1]` won't contain `\` separators

The current approach is fine — it's just slightly unconventional. No change needed.

### 6. Missing `--force` or migration path for npm global installs (Low)

For users who previously ran `npm install -g @packmind/cli`, both `packmind` and `packmind-cli` will be available after updating (since both are in `bin`). This is correct. However, the deprecation warning only shows via `checkDeprecatedBinaryName()` which relies on `process.argv[1]` — this should work correctly with npm's bin stubs.

**No action needed** — the approach is sound.

---

## Files Not Needing Review (Mechanical Renames)

The bulk of the 167 files are mechanical find-and-replace of `packmind-cli` → `packmind` in:
- `.claude/skills/**` — skill documentation
- `.cursor/skills/**` — mirrored skill documentation
- `.github/skills/**` — mirrored skill documentation
- `packages/coding-agent/**/skills/**` — deployed skill TypeScript sources
- `apps/frontend/**` — UI component strings

These are low-risk and consistent.

---

## Conclusion

This is a well-planned and thoroughly executed rename. The backward compatibility approach is robust. The main item to verify before merging is **Homebrew tap coordination** to ensure `brew install packmind` and `brew upgrade packmind` work correctly.
