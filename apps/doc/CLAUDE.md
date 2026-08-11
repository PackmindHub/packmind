# Documentation Application

Mintlify end-user documentation. Content is `.mdx` only — there is no TypeScript, React or build
step in this app.

**Writing the content** is owned by the **`creating-end-user-documentation-for-packmind`** skill.
Mintlify basics (local preview, deployment to Mintlify Cloud) are in `README.md`.

## The step the skill omits: register the page

A new `.mdx` file is unreachable until it is listed in `docs.json` under
`navigation.groups[].pages[]`. The skill does not mention this, so do it yourself. Current groups:
Getting Started, Concepts, Playbook Maintenance, Tools & Integrations, Governance, Linter,
Administration, Security & Privacy — matching the directories, except `home.mdx` and `index.mdx`
which sit at the root.

Note both the skill and `README.md` list the content directories but omit `playbook-maintenance/`,
which does exist and is referenced throughout `docs.json`.

## Commands

- Dev server: `./node_modules/.bin/nx dev doc` — the **only** target this project declares. There is
  no `build`, `test` or `lint` for `doc` (no eslint or jest config), so the generic root commands do
  not apply here.

## Configuration

- `docs.json` holds both configuration and navigation.
- Theme is Mintlify's stock `mint` preset with indigo colours (`primary: #6366f1`) — not a bespoke
  Packmind palette. Note Mintlify's `theme` key selects a *layout* preset, not colours.
- Search is indexed automatically; there is no index to maintain.
