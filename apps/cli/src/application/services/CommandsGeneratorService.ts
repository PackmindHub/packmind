import { IProjectScanResult } from './ProjectScannerService';

export interface IGeneratedCommandStep {
  name: string;
  description: string;
  codeSnippet?: string;
}

export interface IGeneratedCommand {
  name: string;
  summary: string;
  whenToUse: string[];
  contextValidationCheckpoints: string[];
  steps: IGeneratedCommandStep[];
}

export interface ICommandsGeneratorService {
  generateCommands(scanResult: IProjectScanResult): IGeneratedCommand[];
}

export class CommandsGeneratorService implements ICommandsGeneratorService {
  generateCommands(scanResult: IProjectScanResult): IGeneratedCommand[] {
    const commands: IGeneratedCommand[] = [];

    if (scanResult.frameworks.includes('NestJS')) {
      commands.push(this.generateCreateNestJSModuleCommand());
    }

    if (scanResult.frameworks.includes('React')) {
      commands.push(this.generateCreateReactComponentCommand());
    }

    if (scanResult.testFramework) {
      commands.push(this.generateCreateTestCommand(scanResult.testFramework));
    }

    // Python
    if (scanResult.frameworks.includes('Django')) {
      commands.push(this.generateCreateDjangoAppCommand());
    }

    if (scanResult.frameworks.includes('FastAPI')) {
      commands.push(this.generateCreateFastAPIRouterCommand());
    }

    // Java/Kotlin
    if (scanResult.frameworks.includes('Spring Boot')) {
      commands.push(this.generateCreateSpringServiceCommand());
    }

    // C#
    if (scanResult.frameworks.includes('ASP.NET Core')) {
      commands.push(this.generateCreateAspNetControllerCommand());
    }

    // Go
    if (scanResult.languages.includes('Go')) {
      commands.push(this.generateCreateGoServiceCommand());
    }

    return commands;
  }

  private generateCreateNestJSModuleCommand(): IGeneratedCommand {
    return {
      name: 'Create NestJS Module',
      summary:
        'Create a new feature module in NestJS with controller, service, and entity following project structure',
      whenToUse: [
        'Adding a new feature or domain to the application',
        'Creating a new API endpoint with business logic',
        'Setting up a new resource with CRUD operations',
      ],
      contextValidationCheckpoints: [
        'What is the module name?',
        'Does it need database entities?',
        'What API endpoints are required?',
      ],
      steps: [
        {
          name: 'Create module directory',
          description:
            'Create the module directory under src/ following the existing structure',
          codeSnippet: 'mkdir -p src/modules/[module-name]',
        },
        {
          name: 'Create module file',
          description: 'Create the NestJS module file with @Module decorator',
          codeSnippet: `import { Module } from '@nestjs/common';
import { [ModuleName]Controller } from './[module-name].controller';
import { [ModuleName]Service } from './[module-name].service';

@Module({
  controllers: [[ModuleName]Controller],
  providers: [[ModuleName]Service],
  exports: [[ModuleName]Service],
})
export class [ModuleName]Module {}`,
        },
        {
          name: 'Create controller',
          description: 'Create the controller with basic CRUD endpoints',
          codeSnippet: `import { Controller, Get, Post, Body } from '@nestjs/common';
import { [ModuleName]Service } from './[module-name].service';

@Controller('[module-name]')
export class [ModuleName]Controller {
  constructor(private readonly service: [ModuleName]Service) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}`,
        },
        {
          name: 'Create service',
          description: 'Create the service with business logic',
          codeSnippet: `import { Injectable } from '@nestjs/common';

@Injectable()
export class [ModuleName]Service {
  findAll() {
    return [];
  }
}`,
        },
        {
          name: 'Register in AppModule',
          description:
            'Import and register the new module in the root AppModule',
        },
      ],
    };
  }

  private generateCreateReactComponentCommand(): IGeneratedCommand {
    return {
      name: 'Create React Component',
      summary:
        'Create a new React component with TypeScript following project conventions',
      whenToUse: [
        'Adding a new UI component',
        'Creating a reusable widget',
        'Building a new page or view',
      ],
      contextValidationCheckpoints: [
        'What is the component name?',
        'Is it a page component or reusable component?',
        'What props does it need?',
      ],
      steps: [
        {
          name: 'Create component file',
          description:
            'Create the component file with TypeScript interface for props',
          codeSnippet: `interface I[ComponentName]Props {
  // Add props here
}

export function [ComponentName]({ }: I[ComponentName]Props) {
  return (
    <div>
      {/* Component content */}
    </div>
  );
}`,
        },
        {
          name: 'Add component tests',
          description: 'Create test file for the component',
        },
        {
          name: 'Export from index',
          description: 'Export the component from the barrel file',
        },
      ],
    };
  }

  private generateCreateTestCommand(testFramework: string): IGeneratedCommand {
    return {
      name: `Create ${testFramework} Test`,
      summary: `Create a new test file using ${testFramework} following project testing conventions`,
      whenToUse: [
        'Adding tests for new functionality',
        'Writing unit tests for services',
        'Creating integration tests',
      ],
      contextValidationCheckpoints: [
        'What is being tested?',
        'Is it a unit or integration test?',
      ],
      steps: [
        {
          name: 'Create test file',
          description: `Create [filename].spec.ts following ${testFramework} conventions`,
          codeSnippet: `import { describe, it, expect, beforeEach } from '${testFramework}';

describe('[FeatureName]', () => {
  beforeEach(() => {
    // Setup
  });

  it('does something', () => {
    // Arrange
    // Act
    // Assert
  });
});`,
        },
      ],
    };
  }

  // Django Commands
  private generateCreateDjangoAppCommand(): IGeneratedCommand {
    return {
      name: 'Create Django App',
      summary: 'Create a new Django app with models, views, and URLs',
      whenToUse: [
        'Adding a new feature domain to the project',
        'Creating a new API resource',
        'Separating concerns into a dedicated app',
      ],
      contextValidationCheckpoints: [
        'What is the app name?',
        'What models does it need?',
        'Will it have REST API endpoints?',
      ],
      steps: [
        {
          name: 'Create app using Django CLI',
          description: 'Run Django startapp command',
          codeSnippet: 'python manage.py startapp [app_name]',
        },
        {
          name: 'Create models',
          description: 'Define Django models with fields and relationships',
          codeSnippet: `from django.db import models

class [ModelName](models.Model):
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']`,
        },
        {
          name: 'Create serializers (if using DRF)',
          description: 'Create serializers for API responses',
          codeSnippet: `from rest_framework import serializers
from .models import [ModelName]

class [ModelName]Serializer(serializers.ModelSerializer):
    class Meta:
        model = [ModelName]
        fields = '__all__'`,
        },
        {
          name: 'Create views',
          description: 'Implement views or viewsets',
        },
        {
          name: 'Register in settings',
          description: 'Add app to INSTALLED_APPS in settings.py',
        },
      ],
    };
  }

  // FastAPI Commands
  private generateCreateFastAPIRouterCommand(): IGeneratedCommand {
    return {
      name: 'Create FastAPI Router',
      summary: 'Create a new FastAPI router with endpoints and schemas',
      whenToUse: [
        'Adding a new API domain',
        'Creating CRUD endpoints for a resource',
        'Organizing routes by feature',
      ],
      contextValidationCheckpoints: [
        'What is the resource name?',
        'What endpoints are needed (GET, POST, PUT, DELETE)?',
        'What are the request/response schemas?',
      ],
      steps: [
        {
          name: 'Create router module',
          description: 'Create a new router file with APIRouter',
          codeSnippet: `from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter(prefix="/[resource]", tags=["[resource]"])

@router.get("/")
async def list_items(db: Session = Depends(get_db)):
    return []

@router.post("/")
async def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    pass`,
        },
        {
          name: 'Create Pydantic schemas',
          description: 'Define request and response models',
          codeSnippet: `from pydantic import BaseModel

class ItemBase(BaseModel):
    name: str

class ItemCreate(ItemBase):
    pass

class Item(ItemBase):
    id: int

    class Config:
        from_attributes = True`,
        },
        {
          name: 'Register router',
          description: 'Include router in main app',
          codeSnippet: 'app.include_router(router)',
        },
      ],
    };
  }

  // Spring Boot Commands
  private generateCreateSpringServiceCommand(): IGeneratedCommand {
    return {
      name: 'Create Spring Boot Service',
      summary: 'Create a new service layer with repository and controller',
      whenToUse: [
        'Adding a new domain/feature to the application',
        'Creating REST API endpoints',
        'Implementing business logic for an entity',
      ],
      contextValidationCheckpoints: [
        'What is the entity/domain name?',
        'What fields does the entity have?',
        'What endpoints are required?',
      ],
      steps: [
        {
          name: 'Create entity class',
          description: 'Define JPA entity with annotations',
          codeSnippet: `@Entity
@Table(name = "[table_name]")
data class [EntityName](
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,
    val name: String,
    @CreationTimestamp
    val createdAt: LocalDateTime = LocalDateTime.now()
)`,
        },
        {
          name: 'Create repository interface',
          description: 'Define Spring Data JPA repository',
          codeSnippet: `@Repository
interface [EntityName]Repository : JpaRepository<[EntityName], Long> {
    fun findByName(name: String): [EntityName]?
}`,
        },
        {
          name: 'Create service class',
          description: 'Implement business logic',
          codeSnippet: `@Service
class [EntityName]Service(
    private val repository: [EntityName]Repository
) {
    fun findAll(): List<[EntityName]> = repository.findAll()
    fun findById(id: Long): [EntityName]? = repository.findByIdOrNull(id)
    fun create(entity: [EntityName]): [EntityName] = repository.save(entity)
}`,
        },
        {
          name: 'Create controller',
          description: 'Implement REST endpoints',
          codeSnippet: `@RestController
@RequestMapping("/api/[resource]")
class [EntityName]Controller(
    private val service: [EntityName]Service
) {
    @GetMapping
    fun findAll() = service.findAll()

    @PostMapping
    fun create(@RequestBody dto: Create[EntityName]Dto) = service.create(dto.toEntity())
}`,
        },
      ],
    };
  }

  // ASP.NET Core Commands
  private generateCreateAspNetControllerCommand(): IGeneratedCommand {
    return {
      name: 'Create ASP.NET Core Controller',
      summary: 'Create a new API controller with service and repository',
      whenToUse: [
        'Adding a new API resource',
        'Implementing CRUD operations',
        'Creating a new feature endpoint',
      ],
      contextValidationCheckpoints: [
        'What is the resource/entity name?',
        'What operations are needed?',
        'Does it require database access?',
      ],
      steps: [
        {
          name: 'Create entity class',
          description: 'Define entity model',
          codeSnippet: `public class [EntityName]
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}`,
        },
        {
          name: 'Create DTOs',
          description: 'Define request/response DTOs',
          codeSnippet: `public record Create[EntityName]Dto(string Name);
public record [EntityName]Dto(int Id, string Name, DateTime CreatedAt);`,
        },
        {
          name: 'Create service interface and implementation',
          description: 'Implement business logic',
          codeSnippet: `public interface I[EntityName]Service
{
    Task<IEnumerable<[EntityName]Dto>> GetAllAsync();
    Task<[EntityName]Dto?> GetByIdAsync(int id);
    Task<[EntityName]Dto> CreateAsync(Create[EntityName]Dto dto);
}`,
        },
        {
          name: 'Create controller',
          description: 'Implement API endpoints',
          codeSnippet: `[ApiController]
[Route("api/[controller]")]
public class [EntityName]Controller : ControllerBase
{
    private readonly I[EntityName]Service _service;

    public [EntityName]Controller(I[EntityName]Service service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<[EntityName]Dto>>> GetAll()
        => Ok(await _service.GetAllAsync());

    [HttpPost]
    public async Task<ActionResult<[EntityName]Dto>> Create(Create[EntityName]Dto dto)
        => Ok(await _service.CreateAsync(dto));
}`,
        },
        {
          name: 'Register service in DI',
          description: 'Add service to dependency injection container',
          codeSnippet:
            'builder.Services.AddScoped<I[EntityName]Service, [EntityName]Service>();',
        },
      ],
    };
  }

  // Go Commands
  private generateCreateGoServiceCommand(): IGeneratedCommand {
    return {
      name: 'Create Go Service',
      summary: 'Create a new Go service with handler and repository',
      whenToUse: [
        'Adding a new domain to the application',
        'Creating API handlers for a resource',
        'Implementing business logic',
      ],
      contextValidationCheckpoints: [
        'What is the domain/resource name?',
        'What operations are needed?',
        'What is the data structure?',
      ],
      steps: [
        {
          name: 'Create domain types',
          description: 'Define structs and interfaces',
          codeSnippet: `package [domain]

type [Entity] struct {
    ID        int64     \`json:"id"\`
    Name      string    \`json:"name"\`
    CreatedAt time.Time \`json:"created_at"\`
}

type Repository interface {
    FindAll(ctx context.Context) ([]Entity, error)
    FindByID(ctx context.Context, id int64) (*Entity, error)
    Create(ctx context.Context, e *Entity) error
}`,
        },
        {
          name: 'Create service',
          description: 'Implement business logic',
          codeSnippet: `type Service struct {
    repo Repository
}

func NewService(repo Repository) *Service {
    return &Service{repo: repo}
}

func (s *Service) GetAll(ctx context.Context) ([]Entity, error) {
    return s.repo.FindAll(ctx)
}`,
        },
        {
          name: 'Create HTTP handler',
          description: 'Implement HTTP handlers',
          codeSnippet: `type Handler struct {
    svc *Service
}

func NewHandler(svc *Service) *Handler {
    return &Handler{svc: svc}
}

func (h *Handler) GetAll(w http.ResponseWriter, r *http.Request) {
    items, err := h.svc.GetAll(r.Context())
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    json.NewEncoder(w).Encode(items)
}`,
        },
        {
          name: 'Register routes',
          description: 'Wire up HTTP routes',
          codeSnippet: `r.HandleFunc("/api/[resource]", handler.GetAll).Methods("GET")
r.HandleFunc("/api/[resource]", handler.Create).Methods("POST")`,
        },
      ],
    };
  }
}
