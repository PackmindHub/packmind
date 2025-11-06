import { AccountsHexa } from '@packmind/accounts';
import { RecipesHexa } from '@packmind/recipes';
import { StandardsHexa } from '@packmind/standards';
import { SpacesHexa } from '@packmind/spaces';
import { GitHexa } from '@packmind/git';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { JobsHexa } from '@packmind/jobs';
import { DeploymentsHexa } from '@packmind/deployments';
import { DataSource } from 'typeorm';
import { HexaRegistry } from '@packmind/node-utils';
import { AnalyticsHexa } from '@packmind/analytics';

export class TestApp {
  public readonly accountsHexa: AccountsHexa;
  public readonly recipesHexa: RecipesHexa;
  public readonly standardsHexa: StandardsHexa;
  public readonly spacesHexa: SpacesHexa;
  public readonly gitHexa: GitHexa;
  public readonly codingAgentHexa: CodingAgentHexa;
  public readonly jobsHexa: JobsHexa;
  public readonly deploymentsHexa: DeploymentsHexa;
  public readonly analyticsHexa: AnalyticsHexa;

  constructor(dataSource: DataSource) {
    const registry = new HexaRegistry();

    registry.register(SpacesHexa);
    registry.register(AccountsHexa);
    registry.register(JobsHexa);
    registry.register(GitHexa);
    registry.register(RecipesHexa);
    registry.register(StandardsHexa);
    registry.register(CodingAgentHexa);
    registry.register(DeploymentsHexa);
    registry.register(AnalyticsHexa);

    registry.init(dataSource);

    this.accountsHexa = registry.get(AccountsHexa);
    this.recipesHexa = registry.get(RecipesHexa);
    this.standardsHexa = registry.get(StandardsHexa);
    this.spacesHexa = registry.get(SpacesHexa);
    this.gitHexa = registry.get(GitHexa);
    this.codingAgentHexa = registry.get(CodingAgentHexa);
    this.jobsHexa = registry.get(JobsHexa);
    this.deploymentsHexa = registry.get(DeploymentsHexa);
    this.analyticsHexa = registry.get(AnalyticsHexa);
  }

  public async initialize() {
    await this.gitHexa.initialize();
    this.gitHexa.setUserProvider(this.accountsHexa.getUserProvider());
    this.gitHexa.setOrganizationProvider(
      this.accountsHexa.getOrganizationProvider(),
    );
    this.gitHexa.setDeploymentsAdapter(
      this.deploymentsHexa.getDeploymentsUseCases(),
    );

    await this.recipesHexa.initialize();
    await this.recipesHexa.setDeploymentPort(
      this.deploymentsHexa.getDeploymentsUseCases(),
    );
    await this.standardsHexa.initialize();

    // Set standards port in deployments hexa after initialization
    this.deploymentsHexa.setStandardsPort(this.standardsHexa);

    this.accountsHexa.setGitPort(this.gitHexa);
    this.accountsHexa.setStandardsPort(
      this.standardsHexa.getStandardsAdapter(),
    );

    this.deploymentsHexa.setAccountProviders(
      this.accountsHexa.getUserProvider(),
      this.accountsHexa.getOrganizationProvider(),
    );

    this.analyticsHexa.setDeploymentPort(
      this.deploymentsHexa.getDeploymentsUseCases(),
    );
  }
}
