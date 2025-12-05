# [Unreleased]

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

[Unreleased]: https://github.com/PackmindHub/packmind/compare/release/1.4.1...HEAD
[1.3.1]: https://github.com/PackmindHub/packmind/compare/release/1.4.0...release/1.4.1
[1.3.1]: https://github.com/PackmindHub/packmind/compare/release/1.3.1...release/1.4.0
[1.3.1]: https://github.com/PackmindHub/packmind/compare/release/1.3.0...release/1.3.1
[1.3.0]: https://github.com/PackmindHub/packmind/compare/release/1.2.1...release/1.3.0
[1.2.1]: https://github.com/PackmindHub/packmind/compare/release/1.2.0...release/1.2.1
[1.2.0]: https://github.com/PackmindHub/packmind/compare/release/1.1.1...release/1.2.0
[1.1.1]: https://github.com/PackmindHub/packmind/compare/release/1.1.0...release/1.1.1
[1.1.0]: https://github.com/PackmindHub/packmind/compare/release/1.0.1...release/1.1.0
[1.0.1]: https://github.com/PackmindHub/packmind/compare/release/1.0.0...release/1.0.1
[1.0.0]: https://github.com/PackmindHub/packmind/compare/97dce6228693e6f477654dd0018cca583cc95e8c...release/1.0.0
