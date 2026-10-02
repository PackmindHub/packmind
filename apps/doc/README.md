# Packmind Documentation

This documentation is built using [Mintlify](https://mintlify.com/), a modern documentation platform.

## Local Development

To preview the documentation locally:

```bash
npx mintlify dev
```

This command starts a local development server and opens up a browser window. Changes are reflected live without having to restart the server.

## Deployment

Documentation is automatically deployed to Mintlify Cloud when changes are pushed to the repository. No manual deployment is required.

## Documentation Structure

- `docs.json` - Site configuration (its `navigation` key references `navigation.json`)
- `navigation.json` - Navigation: groups and the pages they list
- `getting-started/` - Getting started guides
- `concepts/` - Core concepts documentation
- `playbook-maintenance/` - Playbook maintenance documentation
- `tools/` - Tools and integrations
- `governance/` - Governance documentation
- `linter/` - Linter documentation
- `administration/` - Administration guides
- `security/` - Security and privacy documentation
- `images/` - Images and assets

## Editing Documentation

All documentation files use MDX format (`.mdx`). You can use standard Markdown along with React components.

For more information on Mintlify features, visit [Mintlify documentation](https://mintlify.com/docs).
