import { AccountsHexa } from '@packmind/accounts';
import { AnalyticsHexa } from '@packmind/analytics';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { DeploymentsHexa } from '@packmind/deployments';
import { GitHexa } from '@packmind/git';
import { JobsHexa } from '@packmind/jobs';
import { HexaRegistry } from '@packmind/node-utils';
import { RecipesHexa } from '@packmind/recipes';
import { SpacesHexa } from '@packmind/spaces';
import { StandardsHexa } from '@packmind/standards';
import { DataSource } from 'typeorm';

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
  }
}
