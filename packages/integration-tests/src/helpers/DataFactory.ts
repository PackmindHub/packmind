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
