import { defineConfig } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';

const baseURL = process.env['BASE_URL'] || 'http://localhost:4200';
const isCI = !!process.env.CI;

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  reporter: [['html', { open: isCI ? 'never' : 'on-failure' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    // video and screenshot disabled — Lightpanda has no rendering engine
    video: 'off',
    screenshot: 'off',
  },
  projects: [
    {
      name: 'lightpanda',
    },
  ],
});
