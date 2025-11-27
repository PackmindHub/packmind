import { AccountsHexa } from '@packmind/accounts';
import { AnalyticsHexa } from '@packmind/analytics';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { DeploymentsHexa } from '@packmind/deployments';
import { AmplitudeHexa } from '@packmind/amplitude';
import { LinterHexa } from '@packmind/linter';
import { GitHexa } from '@packmind/git';
import { LlmHexa } from '@packmind/llm';
import {
  HexaRegistry,
  JobsService,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
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
  public llmHexa!: LlmHexa;
  public codingAgentHexa!: CodingAgentHexa;
  public jobsService!: JobsService;
  public deploymentsHexa!: DeploymentsHexa;
  public analyticsHexa!: AnalyticsHexa;
  public linterHexa!: LinterHexa;
  public amplitudeHexa!: AmplitudeHexa;

  private _registry: HexaRegistry;
  private dataSource: DataSource;

  get registry(): HexaRegistry {
    return this._registry;
  }

  constructor(dataSource: DataSource) {
    this._registry = new HexaRegistry();
    this.dataSource = dataSource;

    this._registry.register(SpacesHexa);
    this._registry.register(AccountsHexa);
    this._registry.registerService(JobsService);
    this._registry.registerService(PackmindEventEmitterService);
    this._registry.register(AmplitudeHexa);
    this._registry.register(LlmHexa);
    this._registry.register(GitHexa);
    this._registry.register(LinterHexa);
    this._registry.register(RecipesHexa);
    this._registry.register(StandardsHexa);
    this._registry.register(CodingAgentHexa);
    this._registry.register(DeploymentsHexa);
    this._registry.register(AnalyticsHexa);
  }

  public async initialize() {
    // Initialize the registry (this now includes async initialization)
    await this._registry.init(this.dataSource);

    this.accountsHexa = this._registry.get(AccountsHexa);
    this.recipesHexa = this._registry.get(RecipesHexa);
    this.standardsHexa = this._registry.get(StandardsHexa);
    this.spacesHexa = this._registry.get(SpacesHexa);
    this.gitHexa = this._registry.get(GitHexa);
    this.llmHexa = this._registry.get(LlmHexa);
    this.linterHexa = this._registry.get(LinterHexa);
    this.codingAgentHexa = this._registry.get(CodingAgentHexa);
    this.jobsService = this._registry.getService(JobsService);
    this.deploymentsHexa = this._registry.get(DeploymentsHexa);
    this.analyticsHexa = this._registry.get(AnalyticsHexa);
    this.amplitudeHexa = this._registry.get(AmplitudeHexa);
  }
}
