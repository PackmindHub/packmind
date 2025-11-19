# Packmind OSS — From AI Chaos to Context Engineering

![License](https://img.shields.io/github/license/PackmindHub/packmind)
![Stars](https://img.shields.io/github/stars/PackmindHub/packmind)
[![Main OSS CI/CD Pipeline](https://github.com/PackmindHub/packmind/actions/workflows/main-oss.yml/badge.svg)](https://github.com/PackmindHub/packmind/actions/workflows/main-oss.yml)
![Works with GitHub Copilot](https://img.shields.io/badge/works%20with-GitHub%20Copilot-blue?logo=githubcopilot&logoColor=white)
![Works with Cursor](https://img.shields.io/badge/works%20with-Cursor-blueviolet?logo=cursor&logoColor=white)
![Works with Claude Code](https://img.shields.io/badge/works%20with-Claude%20Code-purple?logo=anthropic&logoColor=white)

**Create, scale, and govern your engineering playbook for AI coding assistants (Copilot, Cursor, Claude Code, Codex, Kiro…).**

- **Create** — turn scattered rules from wikis, ADRs, code reviews and more into a living playbook.
- **Scale** — auto-sync the same context to all repos & agents.
- **Govern** — check adherence to your rules, visualize, and repair drift.

# Documentation

Available here: [https://packmindhub.github.io/packmind](https://packmindhub.github.io/packmind).

# Get started

Choose your preferred setup option:

- **Cloud version**: Create an account at [https://app.packmind.ai](https://app.packmind.ai/sign-up)
- **Self-hosted**: Deploy on your own infrastructure using [Docker Compose or Kubernetes](https://packmindhub.github.io/packmind/gs-install-self-hosted)

## Connect MCP server

The MCP server allows you to interact with Packmind directly from your AI agent (GitHub Copilot, Claude Code, Cursor, etc.) to create and manage standards and recipes.

1. Go to **Account Settings** in Packmind
2. Copy your MCP Access token
3. Configure your AI agent with:
   - MCP server URL: `{PACKMIND_URL}/mcp`
   - Your MCP access token

## Create your first coding standard

Once your MCP server is configured, open your AI agent and use this prompt:

```
Start packmind onboarding
```

Your AI agent will guide you through creating your first coding standard interactively.
Go in Packmind to see the final results.

## Use your coding standards

Make your standards available to your AI coding assistant:

### 1. Create a package

In Packmind, go to **Packages** → **Create Package**, then add your standards and recipes to it.

### 2. Pull locally

```bash
# Install the CLI
npm install -g @packmind/cli

# Get your API key from Packmind: Settings → API Key → Generate Api Key
export PACKMIND_API_KEY_V3="your-api-key"

# Pull your packages
packmind-cli pull --list
packmind-cli pull <package-slug>
```

Your standards are now available in the `.packmind` directory and your AI agent configuration files.

For detailed CLI setup and usage, see the [CLI documentation](https://packmindhub.github.io/packmind/cli).

# :compass: Key Links

- [**Docs →**](https://packmindhub.github.io/packmind/)
- [**Packmind Cloud →**](https://app.packmind.ai/sign-up)
- [**Join the Slack Community →**](https://join.slack.com/t/promyze/shared_invite/zt-vf6asxsj-aH1RbzuoOR5DNFexeaATVQ)
