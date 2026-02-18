import { AccountsHexa, AccountsHexaOpts } from '@packmind/accounts';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { DeploymentsHexa } from '@packmind/deployments';
import { AmplitudeHexa, LinterHexa } from '@packmind/editions';
import { GitHexa } from '@packmind/git';
import { LlmHexa } from '@packmind/llm';
import {
  HexaRegistry,
  JobsService,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import { RecipesHexa } from '@packmind/recipes';
import { SkillsHexa } from '@packmind/skills';
import { SpacesHexa } from '@packmind/spaces';
import { StandardsHexa } from '@packmind/standards';
import { DataSource } from 'typeorm';
import * as jwt from 'jsonwebtoken';
import { PlaybookChangeManagementHexa } from '@packmind/playbook-change-management';

const TEST_JWT_SECRET = 'test-jwt-secret-for-integration-tests';

/**
 * Simple JWT service implementation for integration tests
 */
const testJwtService = {
  sign: (
    payload: Record<string, unknown>,
    options?: { expiresIn?: string | number },
  ): string => {
    return jwt.sign(payload, TEST_JWT_SECRET, options);
  },
  verify: (token: string): Record<string, unknown> => {
    return jwt.verify(token, TEST_JWT_SECRET) as Record<string, unknown>;
  },
};

export class TestApp {
  public accountsHexa!: AccountsHexa;
  public recipesHexa!: RecipesHexa;
  public standardsHexa!: StandardsHexa;
  public skillsHexa!: SkillsHexa;
  public spacesHexa!: SpacesHexa;
  public gitHexa!: GitHexa;
  public llmHexa!: LlmHexa;
  public codingAgentHexa!: CodingAgentHexa;
  public jobsService!: JobsService;
  public deploymentsHexa!: DeploymentsHexa;
  public linterHexa!: LinterHexa;
  public amplitudeHexa!: AmplitudeHexa;
  public playbookManagementHexa!: PlaybookChangeManagementHexa;

  private _registry: HexaRegistry;
  private dataSource: DataSource;

  get registry(): HexaRegistry {
    return this._registry;
  }

  constructor(dataSource: DataSource) {
    this._registry = new HexaRegistry();
    this.dataSource = dataSource;

    this._registry.register(SpacesHexa);
    this._registry.register(AccountsHexa, {
      jwtService: testJwtService,
    } as Partial<AccountsHexaOpts>);
    this._registry.registerService(JobsService);
    this._registry.registerService(PackmindEventEmitterService);
    this._registry.register(AmplitudeHexa);
    this._registry.register(LlmHexa);
    this._registry.register(GitHexa);
    this._registry.register(LinterHexa);
    this._registry.register(RecipesHexa);
    this._registry.register(StandardsHexa);
    this._registry.register(SkillsHexa);
    this._registry.register(CodingAgentHexa);
    this._registry.register(DeploymentsHexa);
    this._registry.register(PlaybookChangeManagementHexa);
  }

  public async initialize() {
    // Initialize the registry (this now includes async initialization)
    await this._registry.init(this.dataSource);

    this.accountsHexa = this._registry.get(AccountsHexa);
    this.recipesHexa = this._registry.get(RecipesHexa);
    this.standardsHexa = this._registry.get(StandardsHexa);
    this.skillsHexa = this._registry.get(SkillsHexa);
    this.spacesHexa = this._registry.get(SpacesHexa);
    this.gitHexa = this._registry.get(GitHexa);
    this.llmHexa = this._registry.get(LlmHexa);
    this.linterHexa = this._registry.get(LinterHexa);
    this.codingAgentHexa = this._registry.get(CodingAgentHexa);
    this.jobsService = this._registry.getService(JobsService);
    this.deploymentsHexa = this._registry.get(DeploymentsHexa);
    this.amplitudeHexa = this._registry.get(AmplitudeHexa);
    this.playbookManagementHexa = this._registry.get(
      PlaybookChangeManagementHexa,
    );
  }
}
