import { AccountsHexa } from '@packmind/accounts';
import { AnalyticsHexa } from '@packmind/analytics';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { DeploymentsHexa } from '@packmind/deployments';
import { EventTrackingHexa } from '@packmind/amplitude';
import { LinterHexa } from '@packmind/linter';
import { GitHexa } from '@packmind/git';
import { HexaRegistry, JobsService } from '@packmind/node-utils';
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
  public jobsService!: JobsService;
  public deploymentsHexa!: DeploymentsHexa;
  public analyticsHexa!: AnalyticsHexa;
  public linterHexa!: LinterHexa;
  public eventTrackingHexa!: EventTrackingHexa;

  private registry: HexaRegistry;
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.registry = new HexaRegistry();
    this.dataSource = dataSource;

    this.registry.register(SpacesHexa);
    this.registry.register(AccountsHexa);
    this.registry.registerService(JobsService);
    this.registry.register(EventTrackingHexa);
    this.registry.register(GitHexa);
    this.registry.register(LinterHexa);
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
    this.linterHexa = this.registry.get(LinterHexa);
    this.codingAgentHexa = this.registry.get(CodingAgentHexa);
    this.jobsService = this.registry.getService(JobsService);
    this.deploymentsHexa = this.registry.get(DeploymentsHexa);
    this.analyticsHexa = this.registry.get(AnalyticsHexa);
    this.eventTrackingHexa = this.registry.get(EventTrackingHexa);
  }
}
