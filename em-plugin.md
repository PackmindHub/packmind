# Render a Packmind package into a usable plugin

## User story

As a **developer (CLI user)**,
I want **to render a Packmind package into a usable Claude Code plugin**,
so that **I can distribute and consume playbook artifacts as a plugin, either inside a plugin marketplace or as a standalone plugin in a workspace**.

## Business value

Packmind packages today live inside Packmind. Rendering a package as a Claude Code plugin lets teams ship their playbook artifacts (commands, skills) through plugin marketplaces or directly into a workspace, so they become installable and consumable like any other Claude Code plugin. This closes the gap between authoring artifacts in Packmind and actually using them in coding assistants.

## Acceptance criteria

### Rule: Render a plugin in a marketplace

**Scenario: Render a package into a marketplace root**

- **Given** package "security" is in org Foo, and an "internal-marketplace" repository exists
- **When** Vincent runs `packmind-cli plugins render @global/security` in the root directory of "internal-marketplace"
- **Then** files from the security package are rendered under `plugins/security`
- **And** `marketplace.json` is updated with a plugin entry `{ "name": "security", "source": "./plugins/security", "description": "Security" }` alongside existing plugins

**Scenario: Updating an existing plugin requires confirmation**

- **Given** package "security" is in org Foo, and "internal-marketplace" already has a `marketplace.json` entry for "security" with source `./backend/plugins/security`
- **When** Vincent runs `packmind-cli plugins render @global/security` in the root directory
- **Then** Vincent is asked to confirm whether the existing plugin should be updated
- **And** if he answers no, nothing happens
- **And** if he answers yes, the plugin is updated in `./backend/plugins/security`

**Scenario: Delete a rendered plugin**

- **Given** package "security" has been rendered as a plugin in the marketplace
- **When** Vincent runs `packmind-cli plugins delete @global/security` in the root directory of "internal-marketplace"
- **Then** the folder `plugins/security` is deleted
- **And** there are no more references to the "security" plugin under the "plugins" section in `marketplace.json`

**Scenario: A remote git source is not rendered locally**

- **Given** "internal-marketplace" has a `marketplace.json` entry for "security" whose source is a git remote (e.g. `git@my-provider.com/security-repo.git`)
- **When** Vincent runs `packmind-cli plugins render @global/security` in the root directory
- **Then** the plugin is not rendered
- **And** Vincent is informed he should run the command on a workspace of the remote plugin

### Rule: Render a plugin out of a marketplace

**Scenario: plugin.json name matches the package**

- **Given** a "backend-plugins" repository with no `.claude-plugin/marketplace.json` and a `.claude-plugin/plugin.json` containing `{ "name": "security" }`
- **When** Vincent runs `packmind-cli plugins render @global/security` in the root directory of the workspace
- **Then** Vincent is asked to confirm whether the existing plugin should be updated
- **And** if he answers no, nothing happens
- **And** if he answers yes, the plugin is updated in the folder

**Scenario: plugin.json name does not match the package**

- **Given** a "backend-plugins" repository with no `.claude-plugin/marketplace.json` and a `.claude-plugin/plugin.json` containing `{ "name": "nodejs" }`
- **When** Vincent runs `packmind-cli plugins render @global/security` in the root directory of the workspace
- **Then** Vincent gets the error message "The plugin 'security' is not handled in this repo"

### Rule: Playbook artifacts are rendered, except standards

**Scenario: Standards are skipped when rendering a package**

- **Given** package "security" contains 2 commands, 5 standards and 2 skills
- **When** Steven renders the package as a plugin
- **Then** skills and commands are rendered
- **And** a message is displayed saying standards are not rendered

### Rule: Plugins rendered are tracked

**Scenario: Rendering a plugin into a marketplace is tracked in Packmind**

- **Given** package "security" is in org Foo, and an "internal-marketplace" repository exists
- **When** Vincent runs `packmind-cli plugins render @global/security` in the root directory of "internal-marketplace"
- **Then** the installation of package `@global/security` is tracked in Packmind
- **And** a new line appears in the distribution history indicating it is distributed in a marketplace

## Out of scope

- Package versioning and plugin auto-update _(inferred — confirm; tracked as a separate user story on the frame)_
- Handling hooks, MCP servers and agents in the rendered plugin _(inferred — confirm; tracked as a separate user story on the frame)_
- Rendering standards as part of the plugin _(inferred — confirm; explicitly excluded by the "except standards" rule)_

## Technical hints

- **Likely affected areas**: CLI `plugins render` / `plugins delete` commands; package rendering pipeline; `marketplace.json` and `.claude-plugin/plugin.json` read/write logic; distribution-history tracking.
- **Considerations**:
  - CLI commands only work when `.claude-plugin/marketplace.json` exists in the working directory (per the workshop note) — define behavior for the "out of a marketplace" case where only `plugin.json` is present.
  - Marketplace entries can point to a local path or a git remote; remote sources must not be rendered locally.
  - Reference: Claude plugin sources — https://code.claude.com/docs/en/plugin-marketplaces#plugin-sources
