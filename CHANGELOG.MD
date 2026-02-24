# [1.10.0] - 2026-02-24

## Added

- Support social login thanks to WorkOS
- Creators or standards, commands and skills are now displayed

## Changed

- Added blank-states for standards, commands and skills

## Fixed

- Fix organization name field auto-refilling instead of showing validation error during sign-up
- Several security issues following a pentest report led by external auditor
- Several improvements to the default skills `packmind-create-standard` and `packmind-create-skills`

# [1.9.0] - 2026-02-06

## Added

- Post-signup onboarding flow with MCP setup guide for AI coding assistants
- Create packages with the CLI using `packmind-cli packages create <name>`
- Create commands with the CLI using `packmind-cli commands create <playbook.json>`
- List standards, commands, and skills with the CLI using `packmind-cli standards list`, `packmind-cli commands list`, and `packmind-cli skills list`
- packmind-onboard skill with structured step-based guidance and AI-driven project analysis
- Add `agents` property in `packmind.json` to configure agents rendering for a target level

# [1.8.0] - 2025-01-28

## Added

- Render skills for GitHub Copilot, Claude Code and Skills (#71)
- Provide downloadable skills to ease managing the playbook
- Delete skills from the app
- Create commands from the app

## Changed

- Overview now displays artifacts that need removal from repositories

# [1.7.0] - 2025-01-07

## Added

## Changed

- split `install_package` MCP tool into two tools (`install_package` and `render_package`) to ensure the agents do not skip some tasks.
- renamed `recipe` to `command` #85
- render commands for Cursor #88
- render commands for Claude Code #86
- render standards as Claude Code rules #87
- render commands in `.packmind/commands/` folder (renamed from `recipes/`) #90

## Fixed

## Removed

# [1.6.0] - 2025-12-22

## Added

- Add possibility to install a package through MCP #54
- Track distribution of packages installed using the command line #38
- Support rendering for Continue.dev #52
- Enable removing packages from the app.

## Changed

- Package form badges for standards and recipes are now clickable links that open in new tabs for easy preview

## Fixed

- On self-hosted versions, fixed a case where the `APP_WEB_URL` ends with a `/` and raised issues

## Removed

- Recipe usage analytics and tracking system
- Deleted standards are properly removed from packages #34

# [1.5.0] - 2025-12-05

## Added

- AI provider is now configurable at organization level from the settings menu (#11)

## Changed

- Structure and formulation of the rules generated through MCP has been improved (#13)

## Fixed

- Server error when switching organization from the rule pages
- Deleted standards and recipes are now properly removed from packages, preventing UUID display and edit issues (#34)

# [1.4.1] - 2025-11-25

## Fixed

- Navigation issues on code examples for rules

# [1.4.0] - 2025-11-21

## Added

- Create and deploy packages to bundle standards and recipes together for organized distribution (#7)

# [1.3.1] - 2025-10-28

## Changed

- Improved the capture of Standards & Recipes through MCP, adding feedback loop and validation from the users (#265)
- The navigation is now scoped to the space `global`, as we're working on the concept of spaces to organize Standards & Recipes (#291)
- UI/UX of overview has been improved (#263)

## Fixed

- Ensure emails are not displayed in server logs (#270)

# [1.3.0] - 2025-10-09

## Added

- Rendering for AI Agents can be configured for each organization (#236)

## Changed

- The Overview layout has improved for better navigation (#263)

## Fixed

- Git repositories and target were not available in the web app until refreshed (#254)
- Issue with Webhook URL has been fixed (#239)
- Docker images are now available in Arm64 in addition to Amd64 (#225)

# [1.2.1] - 2025-10-03

## Changed

- Various UI/UX improvements

# [1.2.0] - 2025-10-02

## Added

- Add admin/member role system (#187)
- A user can create multiple organizations (#186)
- A user can reset their password (#188)

## Changed

- Redesign organization dashboard (#216)
- Harmonize standards/recipes pages (#136)

# [1.1.1] - 2025-09-26

## Changed

- Overview is now grouped by Targets (#172)
- Multiple UI improvements
- Add MCP tool to create first standards

# [1.1.0] - 2025-09-22

## Added

- Introduce the concept of `Targets` to distribute recipes and standards in specific folders on a repo, which makes sense in a mono-repo context (#137)
- Creation of standards is now available through MCP (#178)

## Changed

- Improve rendering of the standards and recipes for AI Agents (#181)
- Improve UI/UX settings for the configuration of Git providers (#155)

## Fixed

- Rendering of recipes index was not properly updated in some edge cases (#101)

# [1.0.1] - 2025-09-11

## Added

- Support AGENTS.md as new target AI Agent (#123)

## Changed

- Improve UI for recipes deployments (#109)
- Better support for programming languages in rule code examples (#116)
- Improve UI/UX and sign-up and sign-in pages (#117)
- Rules are no longer required when creating or updating a standard (#120)

## Fixed

- Code examples for rules are properly saved when new standard versions are created (#121)
- A standard with the same name as a previously deleted one can now be deleted (#135)
- Fix redirection after deleting a standard (#145)

# [1.0.0] - 2025-09-05

## Added

- Create and manage versioned coding standards with rules and guidelines
- Build structured coding recipes for repeatable development workflows
- Deploy standards and recipes to GitHub and GitLab repositories
- Generate AI agent instructions for Cursor, GitHub Copilot, Claude Code, and Junie
- Connect multiple Git providers with token-based authentication
- Create recipes directly from AI agent sessions via MCP server integration
- Add rules to standards using natural language commands
- Track deployment status and identify outdated content across repositories
- Bulk deployment across multiple repositories with atomic commits
- Optional OpenAI integration for enhanced AI-powered features

[1.10.0]: https://github.com/PackmindHub/packmind/compare/release/1.9.0...release/1.10.0
[1.9.0]: https://github.com/PackmindHub/packmind/compare/release/1.8.0...release/1.9.0
[1.8.0]: https://github.com/PackmindHub/packmind/compare/release/1.7.0...release/1.8.0
[1.7.0]: https://github.com/PackmindHub/packmind/compare/release/1.6.0...release/1.7.0
[1.6.0]: https://github.com/PackmindHub/packmind/compare/release/1.5.0...release/1.6.0
[1.5.0]: https://github.com/PackmindHub/packmind/compare/release/1.4.1...release/1.5.0
[1.4.1]: https://github.com/PackmindHub/packmind/compare/release/1.4.0...release/1.4.1
[1.4.0]: https://github.com/PackmindHub/packmind/compare/release/1.3.1...release/1.4.0
[1.3.1]: https://github.com/PackmindHub/packmind/compare/release/1.3.0...release/1.3.1
[1.3.0]: https://github.com/PackmindHub/packmind/compare/release/1.2.1...release/1.3.0
[1.2.1]: https://github.com/PackmindHub/packmind/compare/release/1.2.0...release/1.2.1
[1.2.0]: https://github.com/PackmindHub/packmind/compare/release/1.1.1...release/1.2.0
[1.1.1]: https://github.com/PackmindHub/packmind/compare/release/1.1.0...release/1.1.1
[1.1.0]: https://github.com/PackmindHub/packmind/compare/release/1.0.1...release/1.1.0
[1.0.1]: https://github.com/PackmindHub/packmind/compare/release/1.0.0...release/1.0.1
[1.0.0]: https://github.com/PackmindHub/packmind/compare/97dce6228693e6f477654dd0018cca583cc95e8c...release/1.0.0
