import { register } from 'tsconfig-paths';
import { DataSource } from 'typeorm';

// Register TypeScript path mappings
register({
  baseUrl: '../../',
  paths: {
    '@packmind/git': ['packages/git/src/index.ts'],
    '@packmind/migrations': ['packages/migrations/src/index.ts'],
    '@packmind/recipes': ['packages/recipes/src/index.ts'],
    '@packmind/shared': ['packages/shared/src/index.ts'],
    'packmind-plugin': ['tools/packmind-plugin/src/index.ts'],
    '@packmind/ui': ['packages/ui/src/index.ts'],
  },
});

export default new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'packmind',
  entities: [
    /*...*/
  ],
  migrations: ['src/migrations/*.ts'],
});
