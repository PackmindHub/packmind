# Packmind User Guide

## What's Packmind

Packmind helps engineering teams safely scale AI coding by syncing organizational decisions into GitHub Copilot, Claude Code, Cursor and other assistants, enforcing them via code checks and rewrites, and providing governance with a full ledger of what standards and recipes were applied where. Teams ship faster, with zero rework and full trust.

1. **Capture & normalize engineering playbook**
   Turn scattered rules from docs and code reviews into structured, versioned standards, recipes, and workflows — keeping knowledge consistent and out of experts’ heads.

2. **Align AI and enforce engineering playbook**
   Keep per-repo instruction files always up to date so AI assistants follow organizational rules. Detect and rewrite violations before merge, eliminating costly rework.

3. **Govern & Scale safely**
   Gradually roll out standards and recipes with scopes and drift repair to prevent architectural drift. Track what’s applied where to build trust and safely scale agentic AI.

## Setup Packmind with Docker Compose

For Linux and MacOS users, run this script to create a `./packmind` folder with a Docker Compose setup inside:

```bash
mkdir packmind && \
cd packmind && \
curl -fsSL -o install.sh https://raw.githubusercontent.com/PackmindHub/packmind/refs/heads/main/dockerfile/prod/setup-packmind-compose.sh && \
chmod +x install.sh && \
./install.sh
```

By default, Packmind will be available in `http://localhost:8081`

## Connect your LLM (Optional)

Connecting a LLM offers a better experience when distributing your standards and recipes in your Git Repositories, while it's _not mandatory_ and you can use Packmind without this.

_OpenAI_ is the only currently supported AI Provider.
You need to set your OpenAI key in the `docker-compose.yml` file.

```yaml
x-openai-config: &openai-config
  OPENAI_API_KEY: <YOUR_KEY>
```

Restart then with:

```bash
docker compose up -d
```

## Connect your MCP server to your Agent

The MCP server lets you interact with Packmind within your AI Agents sessions, to create new recipes and coding rules for instances.

Go into **Settings** and get your MCP Access token.

**NB: make sure the URL of Packmind matches the current URL you're using to accessing Packmind**;

## Create your first standard and rules

A standard is unit of rules and guidelines that define how code should be written, organized, and documented.

Here is a basic example of standard:

---

**Standard**: Back-end unit tests

**Rules for this standard**:

- Use assertive names in test names (`it("returns ..."` instead of `it("should return")` ))
- Structure tests with the AAA pattern
- Single expect per test

---

Go in the **Standards** menu and create your first standard.
The description area supports Markdown so you can give more context about it.

Add your first rules, ideally with one clear detailed sentence.

The _scope_ let you define files and folders patterns where the standard applies.
For instance, you may want to use `**/*.spec.ts` if your standards is related to tests.

You can update your standard later to add and remove rules. Each rule can be documented with code examples as well.

### Add rule to an existing standard with MCP

While working with your AI Agent, you often provide instructions regarding code guidelines and standards.

To capitalize on it and not keep it locally, you can use one tool from the MCP like this:

_"Add a rule to our standards 'Back-end unit tests' that states that one single expect must be set for each test"_

## Create Recipes

A coding recipe is a structured set of instructions, a know-how, or a process that can be applied to achieve a specific outcome.
Recipes are repeatable and predictable instructions patterns.

Examples of recipes can be:

- Create or update domain model and the SQL schema, including database migrations
- Add a new use case in a business domain

Recipes are created through the **MCP server** .
As it's a suite of instructions and steps to follow, we recommend providing the better context to create a recipe:

- When you've accomplished a series of tasks in a session with your AI Agent, and you ask to create a recipe based on what's you've done so far
- A commit or a pull request reflects a recipe, and you can ask explicitly to your AI Agent to create a recipe by analyzing one or several commits or by providing a Pull Request URL.

You can also provide several files as context and provide additional information to get better results. Here is an example of instructions:

_"Synthetize the steps we followed to create a new use case and create a Packmind recipe based on this"_

**Updating recipes** is possible from the web app, on the dedicated section of the recipes.

## Standards and Recipes Versions

Every time you update a standard or a recipe, this creates a new version.
This keeps track of the history of your changes, and it's useful to keep track of which versions are currently deployed on Git repositories.

## Distribute your standards and recipes

Now Packmind contains coding standards and recipes, let's distribute them on your Git Repositories.

The distribution will commit instructions files that will be used by AI Agents (Claude Code, Cursor, ...)

Here is an overview of the supported agents:

| AI Agent           | What It Does                 | File Location                     |
| ------------------ | ---------------------------- | --------------------------------- |
| **Cursor**         | Creates rules in YAML format | `.cursor/rules/`                  |
| **GitHub Copilot** | Updates instructions file    | `.github/copilot-instructions.md` |
| **Claude Code**    | Updates instructions file    | `CLAUDE.md`                       |
| **Junie**          | Updates guidelines file      | `.junie/guidelines.md`            |

Files are also written in the `.packmind` folder to be reused by these agents.

_Need support for a new AI agent? You can create an issue in our repository to request support for additional AI coding assistants_

### Connect Git Repositories

You can connect several Git providers in Packmind:

#### For GitHub:

1. Go to **GitHub Settings** → **Developer settings** → **Personal access tokens**
2. Click **Generate new token** (classic)
3. Permissions must include **Contents: read/write**
4. Copy your token (starts with `ghp_` or `github_pat_`)

#### For GitLab:

1. Go to **GitLab User Settings** → **Access Tokens**
2. Create a new token with these scopes:
   - `api` - Full API access
3. Copy your token (starts with `glpat-`)

Once you've added your providers, **add repositories** for each provider.

### Distribute Standards and Recipes

Go on the respective **Recipes** and **Standards** menu to deploy them on Git repositories.

You can either deploy a single or multiple standards/recipes at the same time.
This can be achieved on the page that lists standards and recipes, or in the dedicated page for each standard and recipes.

This distribution creates a single commit for each target repository.

### Get overview of deployments

On the menu, click on **Overview** to list the state of your latest recipes and standards distributions.

This section provides insights on:

- Which Git repositories contain outdated standards and recipes
- Where standards and recipes are deployed
