# Git Repository Connection

:::info
Only users with **Admin** privileges can configure Git providers and manage repositories. If you need to connect repositories, contact your organization administrator.
:::

## Supported Git Providers

Packmind supports multiple Git providers to connect your repositories.

### GitHub Setup

1. Go to **GitHub Settings** → **Developer settings** → **Personal access tokens**
2. Click **Generate new token** (classic)
3. Permissions must include **Contents: read/write**
4. Copy your token (starts with `ghp_` or `github_pat_`)

### GitLab Setup

1. Go to **GitLab User Settings** → **Access Tokens**
2. Create a new token with these scopes:
   - `api` - Full API access
3. Copy your token (starts with `glpat-`)

## Adding Repositories

Once you've added your providers, **add repositories** for each provider.

When you add a Git repository, Packmind automatically creates a default target with the root path "/" for that repository. This allows you to immediately start distributing standards and commands to the entire repository. You can later create additional targets for specific paths within the repository if needed.

## Distribution Targets

Before distributing your standards and commands, you can configure targets in **Settings** → **Distribution** → **Targets**. A target defines a specific path within your Git repository where standards and commands will be distributed.

Targets are particularly useful in monorepo environments where you want to apply different standards to different parts of your codebase. For example:

- `/frontend/` - Apply frontend-specific standards to your React components
- `/apps/api/` - Distribute backend standards to your API code
- `/packages/shared/` - Apply shared library standards to common utilities
- `/` (Created by default when you add a Git Repo)

Each target creates instruction files in its specified path, allowing AI agents to follow the appropriate standards based on the code they're working with.
