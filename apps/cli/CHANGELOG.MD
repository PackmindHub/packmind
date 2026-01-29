# [Unreleased]

## Added

- Add `commands create` command to create reusable commands from playbook JSON files with `packmind-cli commands create <playbook.json>`
- Add `init` command for onboarding: automatically scans projects, generates standards and commands, with optional push to backend
- Add `onboard` command to rescan projects and regenerate content with draft-first flow
- Enhanced `packmind-onboard` default skill with structured step-based guidance and AI-driven project analysis

## Changed

- Improved onboarding with draft-first flow and regeneration loop
- Improved project scanning to detect multiple language ecosystems and technologies

## Fixed

- Fix CLI syntax for command creation to consistently use `commands create` instead of `command create`

## Removed

# [0.14.1] - 2026-01-29

## Fixed

- Remove forgotten debugging when installing packages.

# [0.14.0] - 2026-01-28

## Added

- Add `standards create` command to import standards in Packmind
- Add blacklist filter to `skills add` to exclude unwanted files like `.DS_Store` (#71)
- Added `packmind-cli skills init` to install skills to manage the playbook

## Fixed

- Fix double-slash in login URLs when host ends with trailing slash (#100)

# [0.13.1] - 2026-01-19

## Added

- Add blacklist filter to `skills add` to exclude unwanted files like `.DS_Store` (#71)

## Changed

## Fixed

- Fix `lint` on Windows that was not raising any violations (#97)

## Removed

# [0.13.0] - 2026-01-14

## Added

- Add `skills add` command to import skills in Packmind (#71)

# [0.12.0] - 2026-01-09

## Added

- Added flags `--changed-files` and `--changed-lines` on the linter command to replace the `--diff` option. #93

## Fixed

- Fix linter output when the rule name contains a `/` #94

# [0.11.0] - 2026-01-07

## Added

## Changed

- renamed `recipe` to `command` #85

## Fixed

## Removed

# [0.10.0] - 2025-12-22

## Added

- Allow `continue` as a new target for MCP setup

## Changed

## Fixed

## Removed

# [0.9.0] - 2025-12-16

## Added

- Add `uninstall` command to remove packages and their recipes/standards from the current directory
- Add `remove` command as an alias for `uninstall`

## Changed

## Fixed

## Removed

# [0.8.0] - 2025-12-10

## Added

- add `install -r` to install recursively packages #49
- add `install --status` command to display all packmind.json files and their packages in the workspace #45
- notify packmind after running `packmind-cli install` #38

## Changed

## Fixed

- setup-mcp interactive prompt freezing on macOS when run via install script (curl | sh)
- only files modified are counted in the summary of changes after running `packmind-cli install` #48

## Removed

# [0.7.0] - 2025-12-05

## Added

- Add `login` command to authenticate via browser #31
- Add `logout` command to clear stored credentials #31
- Add `whoami` command to display current authentication status #31
- Add `setup-mcp` command for AI agent configuration #32

## Fixed

- Improve error message when running lint outside a Git repository without a `packmind.json` config #18
- Validate protocol in --host option for login command #31
- Support Git Bash on Windows #31

# [0.6.0] - 2025-11-27

## Added

- Add `--continue-on-error` option to allow skipping error return when violations are found #16
- Add `--continue-on-missing-key` option to skip linting when API key is not set #17
- Add `packkmind.json` support for linter
- Add `--diff` option to `lint` command
  - Add `--diff=files` option to lint modified files only
  - Add `--diff=lines` option to lint modified lines only

## Changed

- Improve layout of the CLI command `install --list` to make slugs easier to identify (#12)

# [0.5.0] - 2025-11-25

## Added

- Add `install` command to install packages and track them in `packmind.json`

# [0.4.0] - 2025-11-19

## Added

- Add packages: #3
  - Add `pull` command to get standards and recipes from a package
  - Add `pull --list` command to list available packages
  - Add `pull --show package` command to get package details
- Add possibility to lint a single file.

# [0.3.4] - 2025-11-13

## Fixed

- Can now lint a file within a directory even though the CLI is not launched at the root of the local git repo.

# [0.3.3] - 2025-11-03

## Fixed

- Add proper CHANGELOG.MD in the GH release

[Unreleased]: https://github.com/PackmindHub/packmind/compare/release-cli/0.14.1...HEAD
[0.14.1]: https://github.com/PackmindHub/packmind/compare/release-cli/0.14.0...release-cli/0.14.1
[0.14.0]: https://github.com/PackmindHub/packmind/compare/release-cli/0.13.1...release-cli/0.14.0
[0.13.1]: https://github.com/PackmindHub/packmind/compare/release-cli/0.13.0...release-cli/0.13.1
[0.13.0]: https://github.com/PackmindHub/packmind/compare/release-cli/0.12.0...release-cli/0.13.0
[0.12.0]: https://github.com/PackmindHub/packmind/compare/release-cli/0.11.0...release-cli/0.12.0
[0.11.0]: https://github.com/PackmindHub/packmind/compare/release-cli/0.10.0...release-cli/0.11.0
[0.10.0]: https://github.com/PackmindHub/packmind/compare/release-cli/0.9.0...release-cli/0.10.0
[0.9.0]: https://github.com/PackmindHub/packmind/compare/release-cli/0.8.0...release-cli/0.9.0
[0.8.0]: https://github.com/PackmindHub/packmind/compare/release-cli/0.7.0...release-cli/0.8.0
[0.7.0]: https://github.com/PackmindHub/packmind/compare/release-cli/0.6.0...release-cli/0.7.0
[0.6.0]: https://github.com/PackmindHub/packmind/compare/release-cli/0.5.0...release-cli/0.6.0
[0.5.0]: https://github.com/PackmindHub/packmind/compare/release-cli/0.4.0...release-cli/0.5.0
[0.4.0]: https://github.com/PackmindHub/packmind/compare/release-cli/0.3.4...release-cli/0.4.0
[0.3.4]: https://github.com/PackmindHub/packmind/compare/release-cli/0.3.3...release-cli/0.3.4
[0.3.3]: https://github.com/PackmindHub/packmind/compare/97dce6228693e6f477654dd0018cca583cc95e8c...release-cli/0.3.3
