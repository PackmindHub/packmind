# Service

**Layer**: Application
**Location**: `packages/{domain}/src/application/services/`

Services contain reusable domain logic called by use cases. They are **not exposed externally** — only use cases and the adapter consume them.

## Service Aggregator

Each domain has a single aggregator that groups all its services:

```typescript
// application/services/StandardsServices.ts
export class StandardsServices {
  private readonly standardService: StandardService;
  private readonly standardVersionService: StandardVersionService;
  private readonly standardBookService: StandardBookService;

  constructor(
    private readonly standardsRepositories: IStandardsRepositories,
    private linterAdapter?: ILinterPort,
    private llmPort?: ILlmPort,
  ) {
    this.standardService = new StandardService(
      this.standardsRepositories.getStandardRepository(),
    );
    this.standardVersionService = new StandardVersionService(
      this.standardsRepositories.getStandardVersionRepository(),
    );
  }

  getStandardService(): StandardService {
    return this.standardService;
  }

  getStandardVersionService(): StandardVersionService {
    return this.standardVersionService;
  }

  // Setter for ports injected later (during initialize phase)
  setLinterAdapter(linterAdapter: ILinterPort): void {
    this.linterAdapter = linterAdapter;
  }
}
```

## Individual Service

Each service focuses on one entity or sub-domain:

```typescript
// application/services/StandardService.ts
export class StandardService {
  constructor(
    private readonly standardRepository: IStandardRepository,
    private readonly logger: PackmindLogger = new PackmindLogger('StandardService'),
  ) {}

  async addStandard(data: CreateStandardData): Promise<Standard> {
    const slug = slugify(data.name);
    const existing = await this.standardRepository.findBySlug(slug, data.organizationId);
    if (existing) {
      throw new StandardAlreadyExistsError(slug);
    }
    return this.standardRepository.save({ ...data, slug });
  }

  async getStandardById(id: StandardId): Promise<Standard | null> {
    return this.standardRepository.findOne(id);
  }
}
```

## Conventions

- **Aggregator naming**: `{Domain}Services` (e.g., `StandardsServices`, `RecipesServices`)
- **Service naming**: `{Entity}Service` (e.g., `StandardService`, `RuleService`)
- **Constructor injection** — repositories and ports via constructor
- **Late port injection** — cross-domain ports set via setters (injected during `Hexa.initialize()`)
- **Logger convention** — `new PackmindLogger('ClassName')` with class name as origin
- **No framework coupling** — services are plain TypeScript classes
