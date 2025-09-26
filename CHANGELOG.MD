# [Unreleased]

# [1.1.0] - 2015-09-22

## Added

- Introduce the concept of `Targets` to distribute recipes and standards in specific folders on a repo, which makes sense in a mono-repo context (#137)
- Creation of standards is now available through MCP (#178)

## Changed

- Improve rendering of the standards and recipes for AI Agents (#181)
- Improve UI/UX settings for the configuration of Git providers (#155)

## Fixed

- Rendering of recipes index was not properly updated in some edge cases (#101)

# [1.0.1] - 2015-09-11

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

# [1.0.0] - 2015-09-05

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

[Unreleased]: https://github.com/PackmindHub/packmind-monorepo/compare/release/1.0.1...HEAD
[1.0.1]: https://github.com/PackmindHub/packmind-monorepo/compare/release/1.0.0...release/1.0.1
[1.0.0]: https://github.com/PackmindHub/packmind-monorepo/compare/1286712f81d6e2b8e18888ee8e23c5503a52c887...release/1.0.0
