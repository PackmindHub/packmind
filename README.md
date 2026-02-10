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
- **Cursor** → `.cursor/rules/*.mdc`, commands, skills
- **AGENTS.md** → `AGENTS.md`
- _(with more formats appearing every month…)_

But your team’s **actual standards aren’t stored anywhere**:

- architecture rules → buried in Slack or Notion
- naming conventions → stuck in your head
- patterns → hiding in PR comments
- best practices → scattered across repos

👉 **Packmind helps you turn all of this into a real engineering playbook**
(standards, commands, skills) so **AI agents finally code _your way_.**

### **2️⃣ “Why am I copy-pasting this across every repo and every agent?”**

Every repo.
Every assistant.
Different files, different folders, different formats.

Keeping everything in sync is impossible.

👉 **Packmind centralizes your playbook once — and distributes it everywhere**,
generating the exact instruction files each AI tool needs, optimized for context.

# Get started

Choose your preferred setup option:

- **Cloud version**: Get started at [https://app.packmind.ai](https://app.packmind.ai/sign-up?utm_source=oss) (free account)
- **Self-hosted**: Deploy on your own infrastructure using [Docker Compose or Kubernetes](https://packmindhub.github.io/packmind/gs-install-self-hosted)

## Option 1: Install the CLI (recommended)

The CLI is the primary way to set up Packmind.

Install it and follow the onboarding to connect to your Packmind organization, create standards, commands, and skills, and distribute them across your repos.

Once authenticated, run in your git repo:

```bash
$> packmind-cli init
```

Then, in your favorite ai coding agent, run:

```
/packmind-onboard
```

To create your first standards and commands from your codebase.

## Option 2: Connect MCP server

The MCP server allows you to create and manage standards and commands directly from your AI agent (GitHub Copilot, Claude Code, Cursor, etc.).

1. Go to **Account Settings** in Packmind
2. Copy your MCP Access token
3. Configure your AI agent with:
   - MCP server URL: `{PACKMIND_URL}/mcp`
   - Your MCP access token

Once set up, open your AI agent and use this prompt:

```
Start packmind onboarding
```

Your AI agent will guide you through creating your first coding standard interactively.

# Documentation

Available here: [https://docs.packmind.com](https://docs.packmind.com).

# :compass: Key Links

- [**Docs →**](https://docs.packmind.com)
- [**Packmind Cloud →**](https://app.packmind.ai/sign-up)
- [**Join the Slack Community →**](https://join.slack.com/t/promyze/shared_invite/zt-vf6asxsj-aH1RbzuoOR5DNFexeaATVQ)
