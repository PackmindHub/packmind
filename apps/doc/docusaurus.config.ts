import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import { join } from 'path';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const gitRepo = process.env.GIT_REPO || 'packmind';

const config: Config = {
  title: 'Packmind',
  tagline: 'Your Tech Lead Copilot',
  favicon: 'img/favicon.svg',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://docs.packmind.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'PackmindHub', // Usually your GitHub org/user name.
  projectName: gitRepo, // Usually your repo name.
  deploymentBranch: 'gh-pages', // The branch that GitHub Pages will deploy from
  trailingSlash: false, // GitHub Pages works better without trailing slashes

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/', // Serve the docs at the site's root
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: `https://github.com/PackmindHub/${gitRepo}/apps/doc/`,
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    function configureWebpackPlugin() {
      return {
        name: 'configure-webpack',
        configureWebpack: () => {
          return {
            resolve: {
              alias: {
                '@packmind/ui': join(__dirname, '../../packages/ui/src'),
                '@packmind/assets': join(
                  __dirname,
                  '../../packages/assets/src',
                ),
                '@packmind/types': join(__dirname, '../../packages/types/src'),
              },
            },
          };
        },
      };
    },
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/packmind-social-card.png',
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Packmind',
      logo: {
        alt: 'Packmind Logo',
        src: 'img/favicon.svg',
        href: '/',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'documentationSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          type: 'docsVersionDropdown',
          position: 'right',
          dropdownItemsAfter: [
            {
              type: 'html',
              value: '<hr style="margin: 0.3rem 0;">',
            },
            {
              to: '/versions',
              label: 'All versions',
            },
          ],
        },
        {
          href: `https://github.com/PackmindHub/${gitRepo}`,
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Documentation',
              to: '/',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Slack',
              href: 'https://packmind.slack.com/',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: `https://github.com/PackmindHub/${gitRepo}`,
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Packmind, Inc. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
