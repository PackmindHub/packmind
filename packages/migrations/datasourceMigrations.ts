import { register } from 'tsconfig-paths';
import { DataSource } from 'typeorm';

// Register TypeScript path mappings
register({
  baseUrl: '../../',
  paths: {
    '@packmind/git': ['packages/git/src/index.ts'],
    '@packmind/logger': ['packages/logger/src/index.ts'],
    '@packmind/migrations': ['packages/migrations/src/index.ts'],
    '@packmind/recipes': ['packages/recipes/src/index.ts'],
    '@packmind/node-utils': ['packages/node-utils/src/index.ts'],
    '@packmind/test-utils': ['packages/test-utils/src/index.ts'],
    '@packmind/types': ['packages/types/src/index.ts'],
    'packmind-plugin': ['tools/packmind-plugin/src/index.ts'],
    '@packmind/ui': ['packages/ui/src/index.ts'],
  },
});

export default new DataSource({
  type: 'postgres',
  url: process.env['DATABASE_URL'],
  entities: [
    /*...*/
  ],
  migrations: ['src/migrations/*.ts'],
});
