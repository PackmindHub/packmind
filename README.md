# One Engineering Playbook. Synced Everywhere. For Every AI Coding Agent.

![License](https://img.shields.io/github/license/PackmindHub/packmind)
![Stars](https://img.shields.io/github/stars/PackmindHub/packmind)
[![Main OSS CI/CD Pipeline](https://github.com/PackmindHub/packmind/actions/workflows/main.yml/badge.svg)](https://github.com/PackmindHub/packmind/actions/workflows/main-oss.yml)
![Works with GitHub Copilot](https://img.shields.io/badge/works%20with-GitHub%20Copilot-blue?logo=githubcopilot&logoColor=white)
![Works with Cursor](https://img.shields.io/badge/works%20with-Cursor-blueviolet?logo=cursor&logoColor=white)
![Works with Claude Code](https://img.shields.io/badge/works%20with-Claude%20Code-purple?logo=anthropic&logoColor=white)

**❗ The 2 big problems every AI-native engineer runs into**

### **1️⃣ “What do I even put in these AI instructions?”**

Every tool expects its own inputs:

- **Copilot** → `.github/copilot-instructions.md`, chat modes, reusable prompts
- **Claude** → `CLAUDE.md`, commands, skills
- **Cursor** → `.cursor/rules/*.mdc`
- **Kiro** → `.kiro/steering/*.md`
- _(with more formats appearing every month…)_

But your team’s **actual standards aren’t stored anywhere**:

- architecture rules → buried in Slack or Notion
- naming conventions → stuck in your head
- patterns → hiding in PR comments
- best practices → scattered across repos

👉 **Packmind helps you turn all of this into a real engineering playbook**  
(standards, rules, patterns, recipes) so **AI agents finally code _your way_.**

### **2️⃣ “Why am I copy-pasting this across every repo and every agent?”**

Every repo.  
Every assistant.  
Different files, different folders, different formats.

Keeping everything in sync is impossible.

👉 **Packmind centralizes your playbook once — and distributes it everywhere**,  
generating the exact instruction files each AI tool needs, optimized for context.

# Get started

Choose your preferred setup option:

- **Cloud version**: Get started at [https://app.packmind.ai](https://app.packmind.ai/start-trial?utm_source=oss) (no account required)
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

## Distribute standards and recipes

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

# Documentation

Available here: [https://packmindhub.github.io/packmind](https://packmindhub.github.io/packmind).

# :compass: Key Links

- [**Docs →**](https://packmindhub.github.io/packmind/)
- [**Packmind Cloud →**](https://app.packmind.ai/sign-up)
- [**Join the Slack Community →**](https://join.slack.com/t/promyze/shared_invite/zt-vf6asxsj-aH1RbzuoOR5DNFexeaATVQ)
