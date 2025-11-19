import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  // Packmind documentation sidebar with organized structure
  documentationSidebar: [
    'index',
    {
      type: 'category',
      label: 'Getting started',
      items: [
        'gs-install-cloud',
        'gs-install-self-hosted',
        'gs-mcp-server-setup',
        'gs-create-standard',
        'gs-create-recipe',
        'gs-distribute',
      ],
      collapsed: false,
    },
    {
      type: 'category',
      label: 'Concepts',
      items: [
        'standards-management',
        'recipes-management',
        'packages-management',
        'mcp-server',
      ],
      collapsed: false,
    },
    {
      type: 'category',
      label: 'Governance',
      items: ['deployment', 'git-repository-connection', 'overview'],
    },
    {
      type: 'category',
      label: 'Linter',
      items: ['linter', 'cli'],
    },
    {
      type: 'category',
      label: 'Administration',
      items: ['manage-users', 'manage-ai-agents'],
    },
  ],
};

export default sidebars;
