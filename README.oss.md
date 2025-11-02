# Packmind OSS — From AI Chaos to Context Engineering

![License](https://img.shields.io/github/license/PackmindHub/packmind)
![Stars](https://img.shields.io/github/stars/PackmindHub/packmind)

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

## Deploy your coding standards

To make your standards available in your repositories:

### 1. Connect your Git provider

**Admins only**: Go to **Settings** → **Git Providers**

**For GitHub:**

1. Go to **GitHub Settings** → **Developer settings** → **Personal access tokens**
2. Generate a new token with **Contents: read/write** permission
3. Copy your token (starts with `ghp_` or `github_pat_`)
4. Add it to Packmind

**For GitLab:**

1. Go to **GitLab User Settings** → **Access Tokens**
2. Create a token with `api` scope
3. Copy your token (starts with `glpat-`)
4. Add it to Packmind

### 2. Add your repositories

Add the repositories where you want to deploy your standards. Packmind automatically creates a default target at the root path `/` for each repository.

### 3. Deploy

1. Go to the **Standards** list
2. Select one or more standards
3. Click **Deploy**
4. Choose your target repository
5. Run the deployment

Your standards are now available in `.packmind` directory and your AI agent configuration files.

# Contribute

_Coming soon_
