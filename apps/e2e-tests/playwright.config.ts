import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://localhost:4200';

/*
 * Every context opens on the current navigation, pinned rather than inherited.
 *
 * The specs were written against that information architecture, and several of
 * them sign up with a `@packmind.com` address to sit inside a feature-flag
 * audience, which is also the audience that now opens on the plugin-first
 * navigation by default. Pinning keeps the two apart: the flag's audience can
 * move without the suite following it. The key mirrors the one
 * `SpaceNavModeContext` reads, and holding a value there is what tells it a
 * mode was chosen.
 */
const currentNavigation = {
  cookies: [],
  origins: [
    {
      origin: baseURL,
      localStorage: [{ name: 'space-nav-mode.v2', value: 'today' }],
    },
  ],
};

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const isCI = !!process.env.CI;

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  /* Reporter configuration - don't serve HTML report interactively in CI (blocks container) */
  reporter: [['html', { open: isCI ? 'never' : 'on-failure' }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    storageState: currentNavigation,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    video: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    /*
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Uncomment for mobile browsers support
    /* {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    }, */

    // Uncomment for branded browsers
    /* {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    } */
  ],
});
