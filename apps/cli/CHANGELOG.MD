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

[0.8.0]: https://github.com/PackmindHub/packmind/compare/release-cli/0.7.0...release-cli/0.8.0
[0.7.0]: https://github.com/PackmindHub/packmind/compare/release-cli/0.6.0...release-cli/0.7.0
[0.6.0]: https://github.com/PackmindHub/packmind/compare/release-cli/0.5.0...release-cli/0.6.0
[0.5.0]: https://github.com/PackmindHub/packmind/compare/release-cli/0.4.0...release-cli/0.5.0
[0.4.0]: https://github.com/PackmindHub/packmind/compare/release-cli/0.3.4...release-cli/0.4.0
[0.3.4]: https://github.com/PackmindHub/packmind/compare/release-cli/0.3.3...release-cli/0.3.4
[0.3.3]: https://github.com/PackmindHub/packmind/compare/97dce6228693e6f477654dd0018cca583cc95e8c...release-cli/0.3.3
