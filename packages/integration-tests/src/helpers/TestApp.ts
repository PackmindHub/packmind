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
  public accountsHexa!: AccountsHexa;
  public recipesHexa!: RecipesHexa;
  public standardsHexa!: StandardsHexa;
  public spacesHexa!: SpacesHexa;
  public gitHexa!: GitHexa;
  public codingAgentHexa!: CodingAgentHexa;
  public jobsHexa!: JobsHexa;
  public deploymentsHexa!: DeploymentsHexa;
  public analyticsHexa!: AnalyticsHexa;

  private registry: HexaRegistry;
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.registry = new HexaRegistry();
    this.dataSource = dataSource;

    this.registry.register(SpacesHexa);
    this.registry.register(AccountsHexa);
    this.registry.register(JobsHexa);
    this.registry.register(GitHexa);
    this.registry.register(RecipesHexa);
    this.registry.register(StandardsHexa);
    this.registry.register(CodingAgentHexa);
    this.registry.register(DeploymentsHexa);
    this.registry.register(AnalyticsHexa);
  }

  public async initialize() {
    // Initialize the registry (this now includes async initialization)
    await this.registry.init(this.dataSource);

    this.accountsHexa = this.registry.get(AccountsHexa);
    this.recipesHexa = this.registry.get(RecipesHexa);
    this.standardsHexa = this.registry.get(StandardsHexa);
    this.spacesHexa = this.registry.get(SpacesHexa);
    this.gitHexa = this.registry.get(GitHexa);
    this.codingAgentHexa = this.registry.get(CodingAgentHexa);
    this.jobsHexa = this.registry.get(JobsHexa);
    this.deploymentsHexa = this.registry.get(DeploymentsHexa);
    this.analyticsHexa = this.registry.get(AnalyticsHexa);

    // Wire up cross-domain dependencies
    this.gitHexa.setUserProvider(this.accountsHexa.getUserProvider());
    this.gitHexa.setOrganizationProvider(
      this.accountsHexa.getOrganizationProvider(),
    );
    this.gitHexa.setDeploymentsAdapter(this.deploymentsHexa.getAdapter());

    await this.recipesHexa.setDeploymentPort(
      this.registry,
      this.deploymentsHexa.getAdapter(),
    );

    // Set standards port in deployments hexa after initialization
    this.deploymentsHexa.setStandardsPort(this.standardsHexa);

    this.accountsHexa.setGitPort(this.gitHexa.getAdapter());
    this.accountsHexa.setStandardsPort(this.standardsHexa.getAdapter());

    this.deploymentsHexa.setAccountProviders(
      this.accountsHexa.getUserProvider(),
      this.accountsHexa.getOrganizationProvider(),
    );

    this.analyticsHexa.setDeploymentPort(this.deploymentsHexa.getAdapter());
  }
}
