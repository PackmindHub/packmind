# Dashboard Performance Optimization — Implementation Plan

> **For agentic execution:** Use `packmind:architect-executor` to execute this plan.

**Goal:** Reduce dashboard load time from ~10s to sub-second initial render by replacing 3 heavy deployment overview API calls with 3 lightweight purpose-built endpoints.

**Architecture:** Three new use cases in the `deployments` hexagon (`getDashboardKpi`, `getDashboardOutdated`, `getDashboardNonLive`), each with a new targeted `DistributionRepository` method that avoids the expensive `listByOrganizationIdWithStatus()` cartesian product query. Frontend dashboard rewired to use these with eager/lazy/on-demand loading strategies.

**Tech stack:** TypeORM QueryBuilder (SQL aggregates), NestJS controller, TanStack Query hooks, existing hexagonal wiring (adapter/port/hexa).

---

## Chunk 1: Contracts, Repository Methods & KPI Use Case

### Task 1: Define contract types for all 3 dashboard endpoints

**Files:**
- Create: `packages/types/src/deployments/contracts/IGetDashboardKpi.ts`
- Create: `packages/types/src/deployments/contracts/IGetDashboardOutdated.ts`
- Create: `packages/types/src/deployments/contracts/IGetDashboardNonLive.ts`
- Modify: `packages/types/src/deployments/contracts/index.ts`
- Modify: `packages/types/src/deployments/index.ts`

**Acceptance criteria:**
- [ ] All 3 contract files export Command, Response, and IUseCase types
- [ ] Types are re-exported from barrel files
- [ ] `nx build types` passes

**Steps:**
- [ ] Create `IGetDashboardKpi.ts`:

```typescript
import { IUseCase, PackmindCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';
import { SpaceId } from '../../spaces/SpaceId';

export type GetDashboardKpiCommand = PackmindCommand & {
  organizationId: OrganizationId;
  spaceId: SpaceId;
};

export type ArtifactKpi = {
  total: number;
  active: number;
};

export type DashboardKpiResponse = {
  standards: ArtifactKpi;
  recipes: ArtifactKpi;
  skills: ArtifactKpi;
};

export type IGetDashboardKpi = IUseCase<
  GetDashboardKpiCommand,
  DashboardKpiResponse
>;
```

- [ ] Create `IGetDashboardOutdated.ts`:

```typescript
import { IUseCase, PackmindCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';
import { SpaceId } from '../../spaces/SpaceId';
import { GitRepo } from '../../git/GitRepo';
import { Target } from '../Target';
import { DeployedStandardTargetInfo } from '../StandardDeploymentOverview';
import { DeployedRecipeTargetInfo } from './IGetDeploymentOverview';

export type GetDashboardOutdatedCommand = PackmindCommand & {
  organizationId: OrganizationId;
  spaceId: SpaceId;
};

export type DashboardOutdatedTarget = {
  target: Target;
  gitRepo: GitRepo;
  outdatedStandards: DeployedStandardTargetInfo[];
  outdatedRecipes: DeployedRecipeTargetInfo[];
};

export type DashboardOutdatedResponse = {
  targets: DashboardOutdatedTarget[];
};

export type IGetDashboardOutdated = IUseCase<
  GetDashboardOutdatedCommand,
  DashboardOutdatedResponse
>;
```

- [ ] Create `IGetDashboardNonLive.ts`:

```typescript
import { IUseCase, PackmindCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';
import { SpaceId } from '../../spaces/SpaceId';

export type GetDashboardNonLiveCommand = PackmindCommand & {
  organizationId: OrganizationId;
  spaceId: SpaceId;
};

export type NonLiveArtifact = {
  id: string;
  name: string;
};

export type NonLiveSkillArtifact = NonLiveArtifact & {
  slug: string;
};

export type DashboardNonLiveResponse = {
  standards: NonLiveArtifact[];
  recipes: NonLiveArtifact[];
  skills: NonLiveSkillArtifact[];
};

export type IGetDashboardNonLive = IUseCase<
  GetDashboardNonLiveCommand,
  DashboardNonLiveResponse
>;
```

- [ ] Add exports to `packages/types/src/deployments/contracts/index.ts` and `packages/types/src/deployments/index.ts`
- [ ] Run: `./node_modules/.bin/nx build types`
- [ ] Lint: `./node_modules/.bin/nx lint types`
- [ ] Commit: `git commit -m "feat(types): add dashboard KPI, outdated, and non-live contracts"`

---

### Task 2: Add `IDistributionRepository` interface methods

**Files:**
- Modify: `packages/deployments/src/domain/repositories/IDistributionRepository.ts`

**Acceptance criteria:**
- [ ] 3 new method signatures added to the interface
- [ ] `nx lint deployments` passes

**Steps:**
- [ ] Add the following methods to `IDistributionRepository`:

```typescript
/**
 * Count distinct artifact IDs that are currently deployed (appear in the
 * latest successful distribution for at least one target) within a space.
 */
countActiveArtifactsBySpace(
  organizationId: OrganizationId,
  spaceId: SpaceId,
): Promise<{ standards: number; recipes: number; skills: number }>;

/**
 * Get distinct artifact IDs from the latest successful distributions
 * across all targets within a space.
 */
listDeployedArtifactIdsBySpace(
  organizationId: OrganizationId,
  spaceId: SpaceId,
): Promise<{
  standardIds: StandardId[];
  recipeIds: RecipeId[];
  skillIds: SkillId[];
}>;

/**
 * Find outdated deployments per target within a space.
 * Returns lightweight DTOs with deployed vs latest version info,
 * only for artifacts where the deployed version differs from latest
 * or the artifact has been deleted.
 */
findOutdatedDeploymentsBySpace(
  organizationId: OrganizationId,
  spaceId: SpaceId,
): Promise<OutdatedDeploymentsByTarget[]>;
```

- [ ] Define the `OutdatedDeploymentsByTarget` type in the interface file (alongside `IDistributionRepository`):

```typescript
export type OutdatedDeploymentInfo = {
  artifactId: string;
  artifactName: string;
  deployedVersion: number;
  latestVersion: number;
  deploymentDate: string;
  isDeleted: boolean;
};

export type OutdatedDeploymentsByTarget = {
  targetId: TargetId;
  targetName: string;
  gitRepoId: string;
  standards: OutdatedDeploymentInfo[];
  recipes: OutdatedDeploymentInfo[];
};
```

- [ ] Lint: `./node_modules/.bin/nx lint deployments`
- [ ] Commit: `git commit -m "feat(deployments): add dashboard repository interface methods"`

---

### Task 3: Implement `countActiveArtifactsBySpace` in `DistributionRepository`

**Files:**
- Modify: `packages/deployments/src/infra/repositories/DistributionRepository.ts`
- Test: `packages/deployments/src/infra/repositories/DistributionRepository.spec.ts` (create if needed)

**Acceptance criteria:**
- [ ] SQL query returns correct counts without loading full entity trees
- [ ] Filtered by organizationId, spaceId, and status=success
- [ ] Returns `{ standards: number, recipes: number, skills: number }`

**Steps:**
- [ ] Write failing test for `countActiveArtifactsBySpace`. Check if `DistributionRepository.spec.ts` already exists — if not, create it. Use the same test approach as other repository specs in the project (check `packages/deployments/src/infra/repositories/` for existing patterns). Mock the `Repository<Distribution>` and use `jest.fn()` for the QueryBuilder chain methods (`createQueryBuilder`, `select`, `innerJoin`, `where`, `getRawOne`, etc.), verifying the query is constructed correctly and the result is parsed.
- [ ] Implement using QueryBuilder — the query should:
  1. Subquery: for each target, find the ID of the latest successful distribution (MAX createdAt or MAX id grouped by targetId)
  2. Filter those distributions by space (via distributed_package → package → spaceId)
  3. Count DISTINCT standardVersion.standardId, recipeVersion.recipeId, skillVersion.skillId across those distributions

```typescript
async countActiveArtifactsBySpace(
  organizationId: OrganizationId,
  spaceId: SpaceId,
): Promise<{ standards: number; recipes: number; skills: number }> {
  this.logger.info('Counting active artifacts by space', { organizationId, spaceId });

  // Subquery: latest successful distribution ID per target within space
  const latestDistributionSubquery = this.repository
    .createQueryBuilder('d')
    .select('MAX(d.id)', 'latestId')
    .innerJoin('d.distributedPackages', 'dp')
    .innerJoin('dp.package', 'p')
    .where('d.organizationId = :organizationId')
    .andWhere('d.status = :status')
    .andWhere('p.spaceId = :spaceId')
    .groupBy('d.targetId');

  // Count distinct artifact IDs from those distributions
  const result = await this.repository
    .createQueryBuilder('dist')
    .innerJoin('dist.distributedPackages', 'distPkg')
    .leftJoin('distPkg.standardVersions', 'sv')
    .leftJoin('distPkg.recipeVersions', 'rv')
    .leftJoin('distPkg.skillVersions', 'skv')
    .where(`dist.id IN (${latestDistributionSubquery.getQuery()})`)
    .setParameters({ organizationId, status: 'success', spaceId })
    .select('COUNT(DISTINCT sv.standardId)', 'standards')
    .addSelect('COUNT(DISTINCT rv.recipeId)', 'recipes')
    .addSelect('COUNT(DISTINCT skv.skillId)', 'skills')
    .getRawOne();

  return {
    standards: parseInt(result?.standards ?? '0', 10),
    recipes: parseInt(result?.recipes ?? '0', 10),
    skills: parseInt(result?.skills ?? '0', 10),
  };
}
```

- [ ] Run tests: `./node_modules/.bin/nx test deployments --testPathPattern=DistributionRepository`
- [ ] Lint: `./node_modules/.bin/nx lint deployments`
- [ ] Commit: `git commit -m "feat(deployments): implement countActiveArtifactsBySpace repository method"`

---

### Task 4: Implement `listDeployedArtifactIdsBySpace` in `DistributionRepository`

**Files:**
- Modify: `packages/deployments/src/infra/repositories/DistributionRepository.ts`

**Acceptance criteria:**
- [ ] Returns distinct artifact IDs from latest successful distributions per target
- [ ] No full entity loading — only IDs

**Steps:**
- [ ] Write failing test for `listDeployedArtifactIdsBySpace`
- [ ] Implement — similar subquery pattern as Task 3, but SELECT DISTINCT IDs instead of COUNT:

```typescript
async listDeployedArtifactIdsBySpace(
  organizationId: OrganizationId,
  spaceId: SpaceId,
): Promise<{
  standardIds: StandardId[];
  recipeIds: RecipeId[];
  skillIds: SkillId[];
}> {
  this.logger.info('Listing deployed artifact IDs by space', { organizationId, spaceId });

  const latestDistributionSubquery = this.repository
    .createQueryBuilder('d')
    .select('MAX(d.id)', 'latestId')
    .innerJoin('d.distributedPackages', 'dp')
    .innerJoin('dp.package', 'p')
    .where('d.organizationId = :organizationId')
    .andWhere('d.status = :status')
    .andWhere('p.spaceId = :spaceId')
    .groupBy('d.targetId');

  const baseQuery = this.repository
    .createQueryBuilder('dist')
    .innerJoin('dist.distributedPackages', 'distPkg')
    .where(`dist.id IN (${latestDistributionSubquery.getQuery()})`)
    .setParameters({ organizationId, status: 'success', spaceId });

  const [standardRows, recipeRows, skillRows] = await Promise.all([
    baseQuery.clone()
      .innerJoin('distPkg.standardVersions', 'sv')
      .select('DISTINCT sv.standardId', 'id')
      .getRawMany(),
    baseQuery.clone()
      .innerJoin('distPkg.recipeVersions', 'rv')
      .select('DISTINCT rv.recipeId', 'id')
      .getRawMany(),
    baseQuery.clone()
      .innerJoin('distPkg.skillVersions', 'skv')
      .select('DISTINCT skv.skillId', 'id')
      .getRawMany(),
  ]);

  return {
    standardIds: standardRows.map((r) => r.id),
    recipeIds: recipeRows.map((r) => r.id),
    skillIds: skillRows.map((r) => r.id),
  };
}
```

- [ ] Run tests: `./node_modules/.bin/nx test deployments --testPathPattern=DistributionRepository`
- [ ] Lint: `./node_modules/.bin/nx lint deployments`
- [ ] Commit: `git commit -m "feat(deployments): implement listDeployedArtifactIdsBySpace repository method"`

---

### Task 5: Implement `GetDashboardKpiUseCase`

**Files:**
- Create: `packages/deployments/src/application/useCases/getDashboardKpi/GetDashboardKpiUseCase.ts`
- Create: `packages/deployments/src/application/useCases/getDashboardKpi/GetDashboardKpiUseCase.spec.ts`

**Acceptance criteria:**
- [ ] Returns correct total and active counts per artifact type
- [ ] Uses `countActiveArtifactsBySpace` — does NOT load full distribution trees
- [ ] Unit tests cover: empty state, all active, partial active, space filtering

**Steps:**
- [ ] Write failing test:

```typescript
describe('GetDashboardKpiUseCase', () => {
  let useCase: GetDashboardKpiUseCase;
  let distributionRepository: jest.Mocked<IDistributionRepository>;
  let standardsPort: jest.Mocked<IStandardsPort>;
  let recipesPort: jest.Mocked<IRecipesPort>;
  let skillsPort: jest.Mocked<ISkillsPort>;

  beforeEach(() => {
    distributionRepository = {
      countActiveArtifactsBySpace: jest.fn(),
      // ... other methods as jest.fn()
    } as jest.Mocked<IDistributionRepository>;

    standardsPort = { listStandardsBySpace: jest.fn() } as any;
    recipesPort = { listRecipesBySpace: jest.fn() } as any;
    skillsPort = { listSkillsBySpace: jest.fn() } as any;

    useCase = new GetDashboardKpiUseCase(
      distributionRepository,
      standardsPort,
      recipesPort,
      skillsPort,
      stubLogger(),
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('execute', () => {
    const command: GetDashboardKpiCommand = {
      organizationId: createOrganizationId('org-1'),
      userId: createUserId('user-1'),
      spaceId: createSpaceId('space-1'),
    };

    describe('when artifacts exist with partial deployment', () => {
      beforeEach(() => {
        standardsPort.listStandardsBySpace.mockResolvedValue([
          { id: 's1', name: 'Standard 1' },
          { id: 's2', name: 'Standard 2' },
          { id: 's3', name: 'Standard 3' },
        ] as Standard[]);
        recipesPort.listRecipesBySpace.mockResolvedValue([
          { id: 'r1', name: 'Recipe 1' },
          { id: 'r2', name: 'Recipe 2' },
        ] as Recipe[]);
        skillsPort.listSkillsBySpace.mockResolvedValue([
          { id: 'sk1', name: 'Skill 1', slug: 'skill-1' },
        ] as Skill[]);
        distributionRepository.countActiveArtifactsBySpace.mockResolvedValue({
          standards: 2, recipes: 1, skills: 0,
        });
      });

      it('returns total and active counts', async () => {
        const result = await useCase.execute(command);
        expect(result).toEqual({
          standards: { total: 3, active: 2 },
          recipes: { total: 2, active: 1 },
          skills: { total: 1, active: 0 },
        });
      });
    });

    describe('when no artifacts exist', () => {
      beforeEach(() => {
        standardsPort.listStandardsBySpace.mockResolvedValue([]);
        recipesPort.listRecipesBySpace.mockResolvedValue([]);
        skillsPort.listSkillsBySpace.mockResolvedValue([]);
        distributionRepository.countActiveArtifactsBySpace.mockResolvedValue({
          standards: 0, recipes: 0, skills: 0,
        });
      });

      it('returns zero counts', async () => {
        const result = await useCase.execute(command);
        expect(result).toEqual({
          standards: { total: 0, active: 0 },
          recipes: { total: 0, active: 0 },
          skills: { total: 0, active: 0 },
        });
      });
    });
  });
});
```

- [ ] Implement `GetDashboardKpiUseCase`:

```typescript
export class GetDashboardKpiUseCase implements IGetDashboardKpi {
  constructor(
    private readonly distributionRepository: IDistributionRepository,
    private readonly standardsPort: IStandardsPort,
    private readonly recipesPort: IRecipesPort,
    private readonly skillsPort: ISkillsPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(command: GetDashboardKpiCommand): Promise<DashboardKpiResponse> {
    const { organizationId, userId, spaceId } = command;
    this.logger.info('Fetching dashboard KPI', { organizationId, spaceId });

    const [standards, recipes, skills, activeCounts] = await Promise.all([
      this.standardsPort.listStandardsBySpace(spaceId, organizationId, userId),
      this.recipesPort.listRecipesBySpace({ spaceId, organizationId, userId }),
      this.skillsPort.listSkillsBySpace(spaceId, organizationId, userId),
      this.distributionRepository.countActiveArtifactsBySpace(organizationId, spaceId),
    ]);

    return {
      standards: { total: standards.length, active: activeCounts.standards },
      recipes: { total: recipes.length, active: activeCounts.recipes },
      skills: { total: skills.length, active: activeCounts.skills },
    };
  }
}
```

- [ ] Run tests: `./node_modules/.bin/nx test deployments --testPathPattern=GetDashboardKpiUseCase`
- [ ] Lint: `./node_modules/.bin/nx lint deployments`
- [ ] Commit: `git commit -m "feat(deployments): add GetDashboardKpiUseCase"`

---

## Chunk 2: Outdated & Non-Live Use Cases

### Task 6: Implement `findOutdatedDeploymentsBySpace` in `DistributionRepository`

**Files:**
- Modify: `packages/deployments/src/infra/repositories/DistributionRepository.ts`

**Acceptance criteria:**
- [ ] Returns per-target outdated artifact info with deployed vs latest version
- [ ] Only returns rows where deployed version < latest version OR artifact is deleted
- [ ] Includes target name and gitRepo info for frontend display

**Steps:**
- [ ] Write failing test for `findOutdatedDeploymentsBySpace`
- [ ] Implement using two separate queries (standards + recipes) merged in-memory by target. The join paths differ per artifact type, so splitting is cleaner than one mega-query.

```typescript
async findOutdatedDeploymentsBySpace(
  organizationId: OrganizationId,
  spaceId: SpaceId,
): Promise<OutdatedDeploymentsByTarget[]> {
  this.logger.info('Finding outdated deployments by space', { organizationId, spaceId });

  // Reuse the same "latest distribution per target" subquery
  const latestDistSubquery = this.repository
    .createQueryBuilder('d')
    .select('MAX(d.id)', 'latestId')
    .innerJoin('d.distributedPackages', 'dp')
    .innerJoin('dp.package', 'p')
    .where('d.organizationId = :organizationId')
    .andWhere('d.status = :status')
    .andWhere('p.spaceId = :spaceId')
    .groupBy('d.targetId');

  const params = { organizationId, status: 'success', spaceId };

  // Query 1: Outdated standards
  const outdatedStandards = await this.repository
    .createQueryBuilder('dist')
    .innerJoin('dist.distributedPackages', 'distPkg')
    .innerJoin('distPkg.standardVersions', 'sv')
    .innerJoin('dist.target', 'target')
    .innerJoin('target.gitRepo', 'gitRepo')
    .where(`dist.id IN (${latestDistSubquery.getQuery()})`)
    .setParameters(params)
    .select('target.id', 'targetId')
    .addSelect('target.name', 'targetName')
    .addSelect('gitRepo.id', 'gitRepoId')
    .addSelect('sv.standardId', 'artifactId')
    .addSelect('sv.version', 'deployedVersion')
    .addSelect('dist.createdAt', 'deploymentDate')
    .getRawMany();

  // Query 2: Outdated recipes (same pattern, different join path)
  const outdatedRecipes = await this.repository
    .createQueryBuilder('dist')
    .innerJoin('dist.distributedPackages', 'distPkg')
    .innerJoin('distPkg.recipeVersions', 'rv')
    .innerJoin('dist.target', 'target')
    .innerJoin('target.gitRepo', 'gitRepo')
    .where(`dist.id IN (${latestDistSubquery.getQuery()})`)
    .setParameters(params)
    .select('target.id', 'targetId')
    .addSelect('target.name', 'targetName')
    .addSelect('gitRepo.id', 'gitRepoId')
    .addSelect('rv.recipeId', 'artifactId')
    .addSelect('rv.version', 'deployedVersion')
    .addSelect('dist.createdAt', 'deploymentDate')
    .getRawMany();

  // Merge by target in-memory
  // The use case (Task 7) will cross-reference with artifact ports
  // to resolve names, latest versions, and deleted status,
  // then filter to only outdated/deleted items.
  // This method returns ALL deployed artifacts per target — filtering
  // happens in the use case which has access to the latest version info.
}
```

Note: This method returns raw deployed artifact data per target. The use case (Task 7) handles the "outdated" filtering by comparing deployed version against latest version from the ports.

- [ ] Run tests: `./node_modules/.bin/nx test deployments --testPathPattern=DistributionRepository`
- [ ] Lint: `./node_modules/.bin/nx lint deployments`
- [ ] Commit: `git commit -m "feat(deployments): implement findOutdatedDeploymentsBySpace repository method"`

---

### Task 7: Implement `GetDashboardOutdatedUseCase`

**Files:**
- Create: `packages/deployments/src/application/useCases/getDashboardOutdated/GetDashboardOutdatedUseCase.ts`
- Create: `packages/deployments/src/application/useCases/getDashboardOutdated/GetDashboardOutdatedUseCase.spec.ts`

**Acceptance criteria:**
- [ ] Returns outdated artifacts grouped by target with gitRepo info
- [ ] Reuses existing `DeployedStandardTargetInfo` and `DeployedRecipeTargetInfo` types for response
- [ ] Unit tests cover: no outdated items, mixed outdated/up-to-date, deleted artifacts

**Steps:**
- [ ] Write failing test:

```typescript
describe('GetDashboardOutdatedUseCase', () => {
  let useCase: GetDashboardOutdatedUseCase;
  let distributionRepository: jest.Mocked<IDistributionRepository>;
  let standardsPort: jest.Mocked<IStandardsPort>;
  let recipesPort: jest.Mocked<IRecipesPort>;
  let gitPort: jest.Mocked<IGitPort>;

  beforeEach(() => {
    distributionRepository = {
      findOutdatedDeploymentsBySpace: jest.fn(),
    } as any;
    standardsPort = { listStandardsBySpace: jest.fn() } as any;
    recipesPort = { listRecipesBySpace: jest.fn() } as any;
    gitPort = { getOrganizationRepositories: jest.fn() } as any;

    useCase = new GetDashboardOutdatedUseCase(
      distributionRepository, standardsPort, recipesPort, gitPort, stubLogger(),
    );
  });

  afterEach(() => jest.clearAllMocks());

  const command: GetDashboardOutdatedCommand = {
    organizationId: createOrganizationId('org-1'),
    userId: createUserId('user-1'),
    spaceId: createSpaceId('space-1'),
  };

  describe('when some artifacts are outdated', () => {
    beforeEach(() => {
      distributionRepository.findOutdatedDeploymentsBySpace.mockResolvedValue([
        {
          targetId: 't1' as TargetId, targetName: 'main', gitRepoId: 'repo-1',
          standards: [{ artifactId: 's1', deployedVersion: 1, deploymentDate: '2026-01-01' }],
          recipes: [],
        },
      ]);
      standardsPort.listStandardsBySpace.mockResolvedValue([
        { id: 's1', name: 'Standard 1', latestVersion: { version: 3 } },
      ] as any);
      recipesPort.listRecipesBySpace.mockResolvedValue([]);
      gitPort.getOrganizationRepositories.mockResolvedValue([
        { id: 'repo-1', owner: 'org', repo: 'my-repo', branch: 'main' },
      ] as any);
    });

    it('returns outdated targets with version gap info', async () => {
      const result = await useCase.execute(command);
      expect(result.targets).toHaveLength(1);
      expect(result.targets[0].outdatedStandards).toHaveLength(1);
      expect(result.targets[0].outdatedStandards[0].isUpToDate).toBe(false);
    });
  });

  describe('when everything is up to date', () => {
    beforeEach(() => {
      distributionRepository.findOutdatedDeploymentsBySpace.mockResolvedValue([]);
      standardsPort.listStandardsBySpace.mockResolvedValue([]);
      recipesPort.listRecipesBySpace.mockResolvedValue([]);
      gitPort.getOrganizationRepositories.mockResolvedValue([]);
    });

    it('returns empty targets array', async () => {
      const result = await useCase.execute(command);
      expect(result.targets).toEqual([]);
    });
  });
});
```

- [ ] Implement `GetDashboardOutdatedUseCase`. The use case fetches raw deployed data from the repo, cross-references with artifact ports to get names/latest versions, then filters to outdated only:

```typescript
export class GetDashboardOutdatedUseCase implements IGetDashboardOutdated {
  constructor(
    private readonly distributionRepository: IDistributionRepository,
    private readonly standardsPort: IStandardsPort,
    private readonly recipesPort: IRecipesPort,
    private readonly gitPort: IGitPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: GetDashboardOutdatedCommand,
  ): Promise<DashboardOutdatedResponse> {
    const { organizationId, userId, spaceId } = command;
    this.logger.info('Fetching dashboard outdated artifacts', { organizationId, spaceId });

    const [deployedByTarget, standards, recipes, gitRepos] = await Promise.all([
      this.distributionRepository.findOutdatedDeploymentsBySpace(organizationId, spaceId),
      this.standardsPort.listStandardsBySpace(spaceId, organizationId, userId, { includeDeleted: true }),
      this.recipesPort.listRecipesBySpace({ spaceId, organizationId, userId }),
      this.gitPort.getOrganizationRepositories(organizationId),
    ]);

    const standardMap = new Map(standards.map((s) => [s.id, s]));
    const recipeMap = new Map(recipes.map((r) => [r.id, r]));
    const gitRepoMap = new Map(gitRepos.map((r) => [r.id, r]));

    const targets: DashboardOutdatedTarget[] = deployedByTarget
      .map((t) => {
        const gitRepo = gitRepoMap.get(t.gitRepoId);
        if (!gitRepo) return null;

        const outdatedStandards: DeployedStandardTargetInfo[] = t.standards
          .map((dep) => {
            const standard = standardMap.get(dep.artifactId);
            if (!standard) return null;
            const latestVersion = standard.latestVersion?.version ?? dep.deployedVersion;
            const isDeleted = !!standard.deletedAt;
            const isUpToDate = dep.deployedVersion >= latestVersion && !isDeleted;
            if (isUpToDate) return null;
            return {
              standard, deployedVersion: { version: dep.deployedVersion } as StandardVersion,
              latestVersion: { version: latestVersion } as StandardVersion,
              isUpToDate: false, deploymentDate: dep.deploymentDate, isDeleted,
            };
          })
          .filter(Boolean) as DeployedStandardTargetInfo[];

        const outdatedRecipes: DeployedRecipeTargetInfo[] = t.recipes
          .map((dep) => {
            const recipe = recipeMap.get(dep.artifactId);
            if (!recipe) return null;
            const latestVersion = recipe.latestVersion?.version ?? dep.deployedVersion;
            const isDeleted = !!recipe.deletedAt;
            const isUpToDate = dep.deployedVersion >= latestVersion && !isDeleted;
            if (isUpToDate) return null;
            return {
              recipe, deployedVersion: { version: dep.deployedVersion } as RecipeVersion,
              latestVersion: { version: latestVersion } as RecipeVersion,
              isUpToDate: false, deploymentDate: dep.deploymentDate, isDeleted,
            };
          })
          .filter(Boolean) as DeployedRecipeTargetInfo[];

        if (outdatedStandards.length === 0 && outdatedRecipes.length === 0) return null;
        return {
          target: { id: t.targetId, name: t.targetName } as Target,
          gitRepo, outdatedStandards, outdatedRecipes,
        };
      })
      .filter(Boolean) as DashboardOutdatedTarget[];

    return { targets };
  }
}
```

- [ ] Run tests: `./node_modules/.bin/nx test deployments --testPathPattern=GetDashboardOutdatedUseCase`
- [ ] Lint: `./node_modules/.bin/nx lint deployments`
- [ ] Commit: `git commit -m "feat(deployments): add GetDashboardOutdatedUseCase"`

---

### Task 8: Implement `GetDashboardNonLiveUseCase`

**Files:**
- Create: `packages/deployments/src/application/useCases/getDashboardNonLive/GetDashboardNonLiveUseCase.ts`
- Create: `packages/deployments/src/application/useCases/getDashboardNonLive/GetDashboardNonLiveUseCase.spec.ts`

**Acceptance criteria:**
- [ ] Returns artifacts that have no deployment to any target
- [ ] Returns only `{ id, name }` (+ `slug` for skills)
- [ ] Unit tests cover: no artifacts, all deployed, some non-live

**Steps:**
- [ ] Write failing test:

```typescript
describe('GetDashboardNonLiveUseCase', () => {
  describe('when some artifacts are not deployed', () => {
    beforeEach(() => {
      standardsPort.listStandardsBySpace.mockResolvedValue([
        { id: 's1', name: 'Standard 1' },
        { id: 's2', name: 'Standard 2' },
        { id: 's3', name: 'Standard 3' },
      ] as Standard[]);
      distributionRepository.listDeployedArtifactIdsBySpace.mockResolvedValue({
        standardIds: ['s1'] as StandardId[],
        recipeIds: [],
        skillIds: [],
      });
    });

    it('returns non-deployed artifacts', async () => {
      const result = await useCase.execute(command);
      expect(result.standards).toEqual([
        { id: 's2', name: 'Standard 2' },
        { id: 's3', name: 'Standard 3' },
      ]);
    });
  });
});
```

- [ ] Implement `GetDashboardNonLiveUseCase`:

```typescript
export class GetDashboardNonLiveUseCase implements IGetDashboardNonLive {
  constructor(
    private readonly distributionRepository: IDistributionRepository,
    private readonly standardsPort: IStandardsPort,
    private readonly recipesPort: IRecipesPort,
    private readonly skillsPort: ISkillsPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: GetDashboardNonLiveCommand,
  ): Promise<DashboardNonLiveResponse> {
    const { organizationId, userId, spaceId } = command;
    this.logger.info('Fetching dashboard non-live artifacts', { organizationId, spaceId });

    const [standards, recipes, skills, deployedIds] = await Promise.all([
      this.standardsPort.listStandardsBySpace(spaceId, organizationId, userId),
      this.recipesPort.listRecipesBySpace({ spaceId, organizationId, userId }),
      this.skillsPort.listSkillsBySpace(spaceId, organizationId, userId),
      this.distributionRepository.listDeployedArtifactIdsBySpace(organizationId, spaceId),
    ]);

    const deployedStandardSet = new Set(deployedIds.standardIds);
    const deployedRecipeSet = new Set(deployedIds.recipeIds);
    const deployedSkillSet = new Set(deployedIds.skillIds);

    return {
      standards: standards
        .filter((s) => !deployedStandardSet.has(s.id))
        .map((s) => ({ id: s.id, name: s.name })),
      recipes: recipes
        .filter((r) => !deployedRecipeSet.has(r.id))
        .map((r) => ({ id: r.id, name: r.name })),
      skills: skills
        .filter((s) => !deployedSkillSet.has(s.id))
        .map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
    };
  }
}
```

- [ ] Run tests: `./node_modules/.bin/nx test deployments --testPathPattern=GetDashboardNonLiveUseCase`
- [ ] Lint: `./node_modules/.bin/nx lint deployments`
- [ ] Commit: `git commit -m "feat(deployments): add GetDashboardNonLiveUseCase"`

---

## Chunk 3: Hexagonal Wiring & API Endpoints

### Task 9: Wire use cases through adapter and port

**Files:**
- Modify: `packages/types/src/deployments/ports/IDeploymentPort.ts`
- Modify: `packages/deployments/src/application/adapter/DeploymentsAdapter.ts`
- Modify: `packages/deployments/src/DeploymentsHexa.ts`
- Modify: `packages/deployments/src/application/useCases/index.ts` (if barrel exists)

**Acceptance criteria:**
- [ ] 3 new methods on `IDeploymentPort`
- [ ] Adapter instantiates use cases in `initialize()` and delegates
- [ ] Hexa passes required ports to adapter
- [ ] `nx build deployments` passes

**Steps:**
- [ ] Add to `IDeploymentPort`:

```typescript
getDashboardKpi(
  command: GetDashboardKpiCommand,
): Promise<DashboardKpiResponse>;

getDashboardOutdated(
  command: GetDashboardOutdatedCommand,
): Promise<DashboardOutdatedResponse>;

getDashboardNonLive(
  command: GetDashboardNonLiveCommand,
): Promise<DashboardNonLiveResponse>;
```

- [ ] Add to `DeploymentsAdapter`:
  - Private fields: `_getDashboardKpiUseCase`, `_getDashboardOutdatedUseCase`, `_getDashboardNonLiveUseCase`
  - Initialize in `initialize()` method with required dependencies
  - Add 3 delegation methods

- [ ] Verify `DeploymentsHexa` already passes the needed ports (`standardsPort`, `recipesPort`, `skillsPort`, `gitPort`) — these should already be retrieved in `initialize()`. No changes expected.

- [ ] Build: `./node_modules/.bin/nx build deployments`
- [ ] Lint: `./node_modules/.bin/nx lint deployments`
- [ ] Commit: `git commit -m "feat(deployments): wire dashboard use cases through adapter and port"`

---

### Task 10: Add API endpoints to deployments controller

**Files:**
- Modify: `apps/api/src/app/organizations/deployments/deployments.service.ts`
- Modify: `apps/api/src/app/organizations/deployments/deployments.controller.ts`

**Acceptance criteria:**
- [ ] 3 new GET endpoints under `/organizations/:orgId/deployments/dashboard/`
- [ ] All member-authenticated with `@Req() request: AuthenticatedRequest`
- [ ] Logging follows existing pattern

**Steps:**
- [ ] Add 3 pass-through methods to `DeploymentsService`:

```typescript
async getDashboardKpi(command: GetDashboardKpiCommand): Promise<DashboardKpiResponse> {
  return this.deploymentAdapter.getDashboardKpi(command);
}

async getDashboardOutdated(command: GetDashboardOutdatedCommand): Promise<DashboardOutdatedResponse> {
  return this.deploymentAdapter.getDashboardOutdated(command);
}

async getDashboardNonLive(command: GetDashboardNonLiveCommand): Promise<DashboardNonLiveResponse> {
  return this.deploymentAdapter.getDashboardNonLive(command);
}
```

- [ ] Check which auth guards/decorators the existing overview endpoints use (e.g., `@UseGuards`, `@Roles`) and replicate on all 3 new endpoints
- [ ] Add `dashboard/kpi` endpoint:

```typescript
@Get('dashboard/kpi')
async getDashboardKpi(
  @Param('orgId') organizationId: OrganizationId,
  @Query('spaceId') spaceId: SpaceId,
  @Req() request: AuthenticatedRequest,
): Promise<DashboardKpiResponse> {
  this.logger.info('GET /organizations/:orgId/deployments/dashboard/kpi', { organizationId });
  try {
    const command: GetDashboardKpiCommand = {
      userId: request.user.userId, organizationId, spaceId,
    };
    return await this.deploymentsService.getDashboardKpi(command);
  } catch (error) {
    this.logger.error('GET /organizations/:orgId/deployments/dashboard/kpi - Failed', {
      organizationId, error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
```

- [ ] Add `dashboard/outdated` endpoint:

```typescript
@Get('dashboard/outdated')
async getDashboardOutdated(
  @Param('orgId') organizationId: OrganizationId,
  @Query('spaceId') spaceId: SpaceId,
  @Req() request: AuthenticatedRequest,
): Promise<DashboardOutdatedResponse> {
  this.logger.info('GET /organizations/:orgId/deployments/dashboard/outdated', { organizationId });
  try {
    const command: GetDashboardOutdatedCommand = {
      userId: request.user.userId, organizationId, spaceId,
    };
    return await this.deploymentsService.getDashboardOutdated(command);
  } catch (error) {
    this.logger.error('GET /organizations/:orgId/deployments/dashboard/outdated - Failed', {
      organizationId, error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
```

- [ ] Add `dashboard/non-live` endpoint:

```typescript
@Get('dashboard/non-live')
async getDashboardNonLive(
  @Param('orgId') organizationId: OrganizationId,
  @Query('spaceId') spaceId: SpaceId,
  @Req() request: AuthenticatedRequest,
): Promise<DashboardNonLiveResponse> {
  this.logger.info('GET /organizations/:orgId/deployments/dashboard/non-live', { organizationId });
  try {
    const command: GetDashboardNonLiveCommand = {
      userId: request.user.userId, organizationId, spaceId,
    };
    return await this.deploymentsService.getDashboardNonLive(command);
  } catch (error) {
    this.logger.error('GET /organizations/:orgId/deployments/dashboard/non-live - Failed', {
      organizationId, error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
```
- [ ] Lint: `./node_modules/.bin/nx lint api`
- [ ] Test: `./node_modules/.bin/nx test api` (if controller tests exist)
- [ ] Commit: `git commit -m "feat(api): add dashboard KPI, outdated, and non-live endpoints"`

---

## Chunk 4: Frontend Integration

### Task 11: Add gateway methods and query hooks

**Files:**
- Modify: `apps/frontend/src/domain/deployments/api/gateways/DeploymentsGateway.ts`
- Modify: `apps/frontend/src/domain/deployments/api/queries/DeploymentsQueries.ts`

**Acceptance criteria:**
- [ ] 3 new gateway methods calling the new endpoints
- [ ] 3 new query hooks with appropriate `enabled` conditions
- [ ] Non-live query has `enabled` parameter for on-demand loading

**Steps:**
- [ ] Add gateway methods:

```typescript
getDashboardKpi: NewGateway<IGetDashboardKpi> = async ({
  organizationId,
  spaceId,
}: NewPackmindCommandBody<GetDashboardKpiCommand>) => {
  return this._api.get(
    `${this._endpoint}/${organizationId}/deployments/dashboard/kpi`,
    { params: { spaceId } },
  );
};

getDashboardOutdated: NewGateway<IGetDashboardOutdated> = async ({
  organizationId,
  spaceId,
}: NewPackmindCommandBody<GetDashboardOutdatedCommand>) => {
  return this._api.get(
    `${this._endpoint}/${organizationId}/deployments/dashboard/outdated`,
    { params: { spaceId } },
  );
};

getDashboardNonLive: NewGateway<IGetDashboardNonLive> = async ({
  organizationId,
  spaceId,
}: NewPackmindCommandBody<GetDashboardNonLiveCommand>) => {
  return this._api.get(
    `${this._endpoint}/${organizationId}/deployments/dashboard/non-live`,
    { params: { spaceId } },
  );
};
```

- [ ] Add query hooks:

```typescript
const GET_DASHBOARD_KPI_KEY = 'getDashboardKpi';
const GET_DASHBOARD_OUTDATED_KEY = 'getDashboardOutdated';
const GET_DASHBOARD_NON_LIVE_KEY = 'getDashboardNonLive';

export const useGetDashboardKpiQuery = (spaceId: string) => {
  const { organization } = useAuthContext();
  return useQuery({
    queryKey: [GET_DASHBOARD_KPI_KEY, spaceId],
    queryFn: () => {
      if (!organization?.id) throw new Error('Organization ID required');
      return deploymentsGateways.getDashboardKpi({
        organizationId: organization.id,
        spaceId: createSpaceId(spaceId),
      });
    },
    enabled: !!organization?.id && !!spaceId,
  });
};

export const useGetDashboardOutdatedQuery = (spaceId: string) => {
  const { organization } = useAuthContext();
  return useQuery({
    queryKey: [GET_DASHBOARD_OUTDATED_KEY, spaceId],
    queryFn: () => {
      if (!organization?.id) throw new Error('Organization ID required');
      return deploymentsGateways.getDashboardOutdated({
        organizationId: organization.id,
        spaceId: createSpaceId(spaceId),
      });
    },
    enabled: !!organization?.id && !!spaceId,
  });
};

export const useGetDashboardNonLiveQuery = (spaceId: string, enabled: boolean) => {
  const { organization } = useAuthContext();
  return useQuery({
    queryKey: [GET_DASHBOARD_NON_LIVE_KEY, spaceId],
    queryFn: () => {
      if (!organization?.id) throw new Error('Organization ID required');
      return deploymentsGateways.getDashboardNonLive({
        organizationId: organization.id,
        spaceId: createSpaceId(spaceId),
      });
    },
    enabled: !!organization?.id && !!spaceId && enabled,
  });
};
```

- [ ] Lint: `./node_modules/.bin/nx lint frontend`
- [ ] Commit: `git commit -m "feat(frontend): add dashboard gateway methods and query hooks"`

---

### Task 12: Rewire DashboardKPI component

**Files:**
- Modify: `apps/frontend/src/domain/organizations/components/dashboard/DashboardKPI.tsx`

**Acceptance criteria:**
- [ ] Uses `useGetDashboardKpiQuery` instead of 3 heavy overview queries
- [ ] Renders identical UI (same colors, progress bars, non-live counts)
- [ ] No visual regression

**Steps:**
- [ ] Replace the 3 overview queries with:

```typescript
const { data: kpi } = useGetDashboardKpiQuery(spaceId ?? '');

const totalStandards = kpi?.standards.total ?? 0;
const activeStandards = kpi?.standards.active ?? 0;
const totalRecipes = kpi?.recipes.total ?? 0;
const activeRecipes = kpi?.recipes.active ?? 0;
const totalSkills = kpi?.skills.total ?? 0;
const activeSkills = kpi?.skills.active ?? 0;
```

- [ ] Remove imports for the 3 old overview query hooks
- [ ] Verify the rest of the component works unchanged (nonLive counts, colors, progress bars all derive from total/active)
- [ ] Lint: `./node_modules/.bin/nx lint frontend`
- [ ] Test: `./node_modules/.bin/nx test frontend`
- [ ] Commit: `git commit -m "feat(frontend): rewire DashboardKPI to use lightweight KPI endpoint"`

---

### Task 13: Rewire OutdatedTargetsSection component

**Files:**
- Modify: `apps/frontend/src/domain/organizations/components/dashboard/OutdatedTargetsSection.tsx`

**Acceptance criteria:**
- [ ] Uses `useGetDashboardOutdatedQuery` instead of 2 heavy overview queries
- [ ] Renders identical UI (same repo/target grouping, outdated badges)
- [ ] `buildReposWithTargets` helper either simplified or removed

**Steps:**
- [ ] Replace the 2 overview queries with:

```typescript
const {
  data: outdatedData,
  isLoading,
  isError,
  error,
} = useGetDashboardOutdatedQuery(spaceId ?? '');
```

- [ ] Replace `buildReposWithTargets` with a direct mapping from `outdatedData.targets`. The API now returns data pre-grouped by target with gitRepo info, so the complex Map-based grouping logic is no longer needed. Map `outdatedData.targets` to the `RepoResult[]` shape that the existing rendering expects (group by gitRepo, then by target within each repo):

```typescript
const reposWithTargets = useMemo(() => {
  if (!outdatedData?.targets) return [];
  const repoMap = new Map<string, RepoResult>();
  for (const t of outdatedData.targets) {
    const { key, title } = getRepoIdentity(t.gitRepo);
    let repo = repoMap.get(key);
    if (!repo) { repo = { repoKey: key, title, targets: [] }; repoMap.set(key, repo); }
    repo.targets.push({
      id: t.target.id, title: t.target.name,
      recipes: t.outdatedRecipes, standards: t.outdatedStandards,
    });
  }
  return Array.from(repoMap.values()).sort((a, b) => a.title.localeCompare(b.title));
}, [outdatedData]);
```

- [ ] Keep the `RepositoryTargetTable` component usage — it already accepts `standards` and `recipes` props
- [ ] Remove old imports
- [ ] Lint: `./node_modules/.bin/nx lint frontend`
- [ ] Test: `./node_modules/.bin/nx test frontend`
- [ ] Commit: `git commit -m "feat(frontend): rewire OutdatedTargetsSection to use lightweight outdated endpoint"`

---

### Task 14: Rewire NonLiveArtifactsModal component

**Files:**
- Modify: `apps/frontend/src/domain/organizations/components/dashboard/NonLiveArtifactsModal.tsx`

**Acceptance criteria:**
- [ ] Uses `useGetDashboardNonLiveQuery` with `enabled: open`
- [ ] Query only fires when modal is opened
- [ ] Renders identical UI (same tab structure, artifact names with links)

**Steps:**
- [ ] Replace the 3 overview queries with:

```typescript
const { data: nonLiveData } = useGetDashboardNonLiveQuery(
  spaceId ?? '',
  open,  // only fetch when modal is open
);

const nonLiveStandards = nonLiveData?.standards ?? [];
const nonLiveRecipes = nonLiveData?.recipes ?? [];
const nonLiveSkills = nonLiveData?.skills ?? [];
```

- [ ] Update row mapping — the data shape changes from `item.standard.name` to `item.name` and `item.standard.id` to `item.id`:

```typescript
const standardRows: PMTableRow[] = nonLiveStandards.map((item) => ({
  key: item.id,
  name: orgSlug && effectiveSpaceSlug ? (
    <PMLink asChild>
      <Link to={routes.space.toStandard(orgSlug, effectiveSpaceSlug, item.id)}>
        {item.name}
      </Link>
    </PMLink>
  ) : (
    item.name
  ),
}));
```

- [ ] Same for recipes and skills (skills use `item.slug` for routing)
- [ ] Update tab trigger labels to use `nonLiveStandards.length` etc.
- [ ] Remove old imports
- [ ] Final verification: confirm no dashboard component still imports the old overview query hooks (`useGetRecipesDeploymentOverviewQuery`, `useGetStandardsDeploymentOverviewQuery`, `useGetSkillsDeploymentOverviewQuery`). The old hooks must NOT be deleted — they're still used by the deployment pages.
- [ ] Lint: `./node_modules/.bin/nx lint frontend`
- [ ] Test: `./node_modules/.bin/nx test frontend`
- [ ] Build: `./node_modules/.bin/nx build frontend`
- [ ] Commit: `git commit -m "feat(frontend): rewire NonLiveArtifactsModal to use on-demand non-live endpoint"`
