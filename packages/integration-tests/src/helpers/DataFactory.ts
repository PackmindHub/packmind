import { TestApp } from './TestApp';
import {
  Organization,
  PackmindCommand,
  SignUpWithOrganizationCommand,
  User,
  GitProvider,
  GitRepo,
  Recipe,
  RenderMode,
  Space,
  Standard,
  Target,
} from '@packmind/types';
import { DataSource } from 'typeorm';

import { standardFactory } from '@packmind/standards/test';
import { recipeFactory } from '@packmind/recipes/test';
import { gitProviderFactory, gitRepoFactory } from '@packmind/git/test';

export class DataFactory {
  private _user!: User;
  private _organization!: Organization;
  private _space!: Space;

  private _gitProvider!: GitProvider;
  private _gitRepo!: GitRepo;

  private _target!: Target;

  constructor(private readonly testApp: TestApp) {}

  async withUserAndOrganization(cmd?: Partial<SignUpWithOrganizationCommand>) {
    if (!this.user) {
      const signUpWithOrganizationResponse = await this.testApp.accountsHexa
        .getAdapter()
        .signUpWithOrganization({
          ...cmd,
          organizationName: 'test orga',
          email: 'someone@example.com',
          password: 'some-secret-password',
        });

      this._user = signUpWithOrganizationResponse.user;
      this._organization = signUpWithOrganizationResponse.organization;

      const spaces = await this.testApp.spacesHexa
        .getAdapter()
        .listSpacesByOrganization(this._organization.id);

      this._space = spaces[0];
    }

    return {
      user: this.user,
      organization: this.organization,
      space: this.space,
    };
  }

  get user() {
    return this._user;
  }
  get organization() {
    return this._organization;
  }
  get space() {
    return this._space;
  }

  async withGitProvider(provider?: Partial<GitProvider>) {
    if (!this.gitProvider) {
      await this.withUserAndOrganization();

      this._gitProvider = await this.testApp.gitHexa
        .getAdapter()
        .addGitProvider({
          ...this.packmindCommand(),
          gitProvider: gitProviderFactory({
            organizationId: this.organization.id,
            ...provider,
          }),
        });
    }

    return { gitProvider: this.gitProvider };
  }
  get gitProvider() {
    return this._gitProvider;
  }

  async withGitRepo(gitRepo?: Partial<GitRepo>) {
    if (!this._gitRepo) {
      await this.withGitProvider();

      this._gitRepo = await this.testApp.gitHexa.getAdapter().addGitRepo({
        ...this.packmindCommand(),
        gitProviderId: this.gitProvider.id,
        ...gitRepoFactory({ providerId: this.gitProvider.id, ...gitRepo }),
      });

      const targets = await this.testApp.deploymentsHexa
        .getAdapter()
        .getTargetsByGitRepo({
          ...this.packmindCommand(),
          gitRepoId: this._gitRepo.id,
        });
      this._target = targets[0];
    }

    return { gitRepo: this.gitRepo, target: this.target };
  }
  get gitRepo() {
    return this._gitRepo;
  }

  get target() {
    return this._target;
  }

  async withStandard(standard?: Partial<Standard>): Promise<Standard> {
    if (!this.user) {
      await this.withUserAndOrganization();
    }

    return this.testApp.standardsHexa.getAdapter().createStandard({
      rules: [],
      organizationId: this.organization.id,
      ...standardFactory({ spaceId: this.space.id, ...standard }),
    });
  }

  async withRecipe(recipe?: Partial<Recipe>): Promise<Recipe> {
    if (!this.user) {
      await this.withUserAndOrganization();
    }

    return this.testApp.recipesHexa.getAdapter().captureRecipe({
      ...this.packmindCommand(),
      ...recipeFactory({ spaceId: this.space.id }),
      ...recipe,
    });
  }

  async withRenderMode(
    activeRenderModes: RenderMode[] = [
      RenderMode.PACKMIND,
      RenderMode.AGENTS_MD,
    ],
  ) {
    if (!this.user) {
      await this.withUserAndOrganization();
    }

    return this.testApp.deploymentsHexa
      .getAdapter()
      .updateRenderModeConfiguration({
        ...this.packmindCommand(),
        activeRenderModes,
      });
  }

  public packmindCommand(): PackmindCommand {
    return {
      userId: this.user.id,
      organizationId: this.organization.id,
    };
  }
}

// Cache for table names per datasource to avoid rebuilding on every cleanup
const tableNamesCache = new WeakMap<DataSource, string>();
const entityMetadatasCache = new WeakMap<
  DataSource,
  Array<{ tableName: string }>
>();

/**
 * Gets cached table names for a datasource, building the cache if needed.
 * This avoids rebuilding the table list on every cleanup call.
 */
function getCachedTableNames(dataSource: DataSource): {
  tableNames: string;
  entityMetadatas: Array<{ tableName: string }>;
} {
  let tableNames = tableNamesCache.get(dataSource);
  let entityMetadatas = entityMetadatasCache.get(dataSource);

  if (!tableNames || !entityMetadatas) {
    // Build cache if not present
    entityMetadatas = dataSource.entityMetadatas;

    if (entityMetadatas.length === 0) {
      tableNames = '';
    } else {
      tableNames = entityMetadatas
        .map((metadata) => `"${metadata.tableName}"`)
        .join(', ');
    }

    // Store in cache
    tableNamesCache.set(dataSource, tableNames);
    entityMetadatasCache.set(dataSource, entityMetadatas);
  }

  return { tableNames, entityMetadatas };
}

/**
 * Cleans all data from the test database by truncating all tables.
 * This is used to reset the database state between tests when using a shared datasource.
 * Uses TRUNCATE CASCADE for better performance than DELETE, and handles foreign keys automatically.
 * Table names are cached to avoid rebuilding the list on every call.
 */
export async function cleanTestDatabase(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  try {
    // Get cached table names and metadata
    const { tableNames, entityMetadatas } = getCachedTableNames(dataSource);

    if (!tableNames || entityMetadatas.length === 0) {
      return;
    }

    // Use TRUNCATE CASCADE to efficiently clear all tables and handle foreign keys
    // This is much faster than DELETE and automatically handles referential integrity
    try {
      await queryRunner.query(`TRUNCATE TABLE ${tableNames} CASCADE;`);
    } catch {
      // If TRUNCATE CASCADE fails (e.g., pg-mem doesn't support it), fall back to DELETE
      // Delete in reverse order to handle foreign key constraints
      for (const metadata of entityMetadatas.reverse()) {
        try {
          const tableName = metadata.tableName;
          await queryRunner.query(`DELETE FROM "${tableName}";`);
        } catch {
          // Ignore errors for tables with foreign key constraints
        }
      }
      // Second pass in forward order for any remaining data
      for (const metadata of entityMetadatas) {
        try {
          const tableName = metadata.tableName;
          await queryRunner.query(`DELETE FROM "${tableName}";`);
        } catch {
          // Ignore errors
        }
      }
    }
  } finally {
    await queryRunner.release();
  }
}
