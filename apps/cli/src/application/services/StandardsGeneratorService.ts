import { IProjectScanResult } from './ProjectScannerService';
import { IExistingDocumentation } from './DocumentationScannerService';

export interface IGeneratedRule {
  content: string;
  examples?: {
    positive: string;
    negative: string;
    language: string;
  };
}

export interface IGeneratedStandard {
  name: string;
  description: string;
  summary: string;
  rules: IGeneratedRule[];
}

export interface IStandardsGeneratorService {
  generateStandards(
    scanResult: IProjectScanResult,
    existingDocs: IExistingDocumentation,
  ): IGeneratedStandard[];
}

export class StandardsGeneratorService implements IStandardsGeneratorService {
  generateStandards(
    scanResult: IProjectScanResult,
    existingDocs: IExistingDocumentation,
  ): IGeneratedStandard[] {
    const standards: IGeneratedStandard[] = [];

    // Generate from existing documentation first
    if (
      existingDocs.extractedRules.length > 0 ||
      existingDocs.extractedConventions.length > 0
    ) {
      standards.push(this.generateExtractedStandard(existingDocs));
    }

    if (scanResult.hasTypeScript) {
      standards.push(this.generateTypeScriptStandard());
    }

    if (scanResult.frameworks.includes('NestJS')) {
      standards.push(this.generateNestJSStandard());
    }

    if (scanResult.frameworks.includes('React')) {
      standards.push(this.generateReactStandard());
    }

    if (scanResult.testFramework) {
      standards.push(this.generateTestingStandard(scanResult.testFramework));
    }

    if (scanResult.structure.isMonorepo) {
      standards.push(this.generateMonorepoStandard());
    }

    // Python
    if (scanResult.languages.includes('Python')) {
      standards.push(this.generatePythonStandard());
    }

    if (scanResult.frameworks.includes('Django')) {
      standards.push(this.generateDjangoStandard());
    }

    if (scanResult.frameworks.includes('FastAPI')) {
      standards.push(this.generateFastAPIStandard());
    }

    // Java/Kotlin
    if (
      scanResult.languages.includes('Java') ||
      scanResult.languages.includes('Kotlin')
    ) {
      standards.push(this.generateJavaKotlinStandard());
    }

    if (scanResult.frameworks.includes('Spring Boot')) {
      standards.push(this.generateSpringBootStandard());
    }

    // C#
    if (scanResult.languages.includes('C#')) {
      standards.push(this.generateCSharpStandard());
    }

    if (scanResult.frameworks.includes('ASP.NET Core')) {
      standards.push(this.generateAspNetCoreStandard());
    }

    // Go
    if (scanResult.languages.includes('Go')) {
      standards.push(this.generateGoStandard());
    }

    return standards;
  }

  private generateExtractedStandard(
    existingDocs: IExistingDocumentation,
  ): IGeneratedStandard {
    const allRules = [
      ...existingDocs.extractedRules,
      ...existingDocs.extractedConventions,
    ];

    return {
      name: 'Extracted Project Standards',
      summary: `Apply standards extracted from ${existingDocs.sourceFiles.join(', ')}`,
      description: `Standards and conventions extracted from existing project documentation including ${existingDocs.sourceFiles.join(', ')}. These represent the team's established practices and guidelines.`,
      rules: allRules.slice(0, 15).map((rule) => ({ content: rule })),
    };
  }

  private generateTypeScriptStandard(): IGeneratedStandard {
    return {
      name: 'TypeScript Coding Standards',
      summary:
        'Apply TypeScript best practices for type safety and code quality',
      description:
        'Standards for writing clean, type-safe TypeScript code with proper interfaces, types, and naming conventions.',
      rules: [
        {
          content:
            'Prefix interfaces with "I" to distinguish them from types and classes',
          examples: {
            positive: 'interface IUser {\n  id: string;\n  name: string;\n}',
            negative: 'interface User {\n  id: string;\n  name: string;\n}',
            language: 'TYPESCRIPT',
          },
        },
        {
          content:
            'Use "type" for plain objects and "interface" when implementation is required',
          examples: {
            positive:
              'type UserDTO = {\n  id: string;\n  name: string;\n};\n\ninterface IUserRepository {\n  findById(id: string): Promise<User>;\n}',
            negative: 'interface UserDTO {\n  id: string;\n  name: string;\n}',
            language: 'TYPESCRIPT',
          },
        },
        {
          content:
            'Use explicit return types for functions to improve type inference',
        },
        {
          content: 'Avoid using "any" type - prefer "unknown" or proper types',
        },
      ],
    };
  }

  private generateNestJSStandard(): IGeneratedStandard {
    return {
      name: 'NestJS Architecture Standards',
      summary:
        'Apply NestJS architectural patterns for modular and maintainable backend services',
      description:
        'Standards for structuring NestJS applications with proper module organization, dependency injection, and controller patterns.',
      rules: [
        {
          content:
            'Organize code by feature modules, each with its own controller, service, and entities',
        },
        {
          content:
            'Use dependency injection for all service dependencies via constructor injection',
          examples: {
            positive:
              '@Injectable()\nexport class UserService {\n  constructor(\n    @InjectRepository(User)\n    private userRepo: Repository<User>\n  ) {}\n}',
            negative:
              '@Injectable()\nexport class UserService {\n  private userRepo = new Repository();\n}',
            language: 'TYPESCRIPT',
          },
        },
        {
          content: 'Prefix abstract classes with "Abstract" for base classes',
        },
        {
          content:
            'Use DTOs (Data Transfer Objects) for request validation with class-validator',
        },
      ],
    };
  }

  private generateReactStandard(): IGeneratedStandard {
    return {
      name: 'React Component Standards',
      summary:
        'Apply React best practices for component structure and hooks usage',
      description:
        'Standards for building React components with hooks, proper state management, and component composition.',
      rules: [
        {
          content:
            'Use functional components with hooks instead of class components',
        },
        {
          content: 'Extract custom hooks for reusable stateful logic',
        },
        {
          content: 'Use TypeScript interfaces for component props',
        },
        {
          content: 'Keep components focused on single responsibility',
        },
      ],
    };
  }

  private generateTestingStandard(testFramework: string): IGeneratedStandard {
    return {
      name: `${testFramework.charAt(0).toUpperCase() + testFramework.slice(1)} Testing Standards`,
      summary: `Apply ${testFramework} testing best practices for reliable test suites`,
      description: `Standards for writing maintainable tests using ${testFramework} with proper structure and assertions.`,
      rules: [
        {
          content:
            'Use descriptive test names that explain the expected behavior',
        },
        {
          content: 'Follow Arrange-Act-Assert pattern for test structure',
        },
        {
          content: 'Keep one assertion per test for clarity',
        },
        {
          content: 'Use "describe" blocks to group related tests',
        },
      ],
    };
  }

  private generateMonorepoStandard(): IGeneratedStandard {
    return {
      name: 'Monorepo Organization Standards',
      summary:
        'Apply monorepo best practices for package organization and dependencies',
      description:
        'Standards for organizing code in a monorepo structure with clear package boundaries and dependency management.',
      rules: [
        {
          content: 'Organize packages by domain or feature, not by layer',
        },
        {
          content: 'Use workspace protocols for internal package dependencies',
        },
        {
          content: 'Keep shared code in dedicated packages',
        },
      ],
    };
  }

  // Python Standards
  private generatePythonStandard(): IGeneratedStandard {
    return {
      name: 'Python Coding Standards',
      summary: 'Apply Python best practices following PEP 8 and modern idioms',
      description:
        'Standards for writing clean, maintainable Python code with proper naming, typing, and structure.',
      rules: [
        {
          content:
            'Use snake_case for functions and variables, PascalCase for classes',
          examples: {
            positive:
              'def calculate_total(items: list) -> float:\n    pass\n\nclass OrderProcessor:\n    pass',
            negative:
              'def calculateTotal(items):\n    pass\n\nclass order_processor:\n    pass',
            language: 'PYTHON',
          },
        },
        {
          content: 'Use type hints for function parameters and return values',
          examples: {
            positive: 'def get_user(user_id: int) -> User | None:\n    pass',
            negative: 'def get_user(user_id):\n    pass',
            language: 'PYTHON',
          },
        },
        {
          content: 'Use dataclasses or Pydantic models for data structures',
        },
        {
          content: 'Prefer explicit imports over wildcard imports',
        },
      ],
    };
  }

  private generateDjangoStandard(): IGeneratedStandard {
    return {
      name: 'Django Architecture Standards',
      summary: 'Apply Django best practices for web application development',
      description:
        'Standards for structuring Django applications with proper model design, views, and templates.',
      rules: [
        {
          content:
            'Organize code by Django apps, each focused on a single domain',
        },
        {
          content:
            'Use class-based views for complex logic, function views for simple endpoints',
        },
        {
          content:
            'Keep business logic in models or service layers, not in views',
        },
        {
          content:
            'Use Django ORM querysets efficiently with select_related and prefetch_related',
        },
      ],
    };
  }

  private generateFastAPIStandard(): IGeneratedStandard {
    return {
      name: 'FastAPI Architecture Standards',
      summary: 'Apply FastAPI best practices for building modern APIs',
      description:
        'Standards for building FastAPI applications with proper routing, dependency injection, and validation.',
      rules: [
        {
          content: 'Use Pydantic models for request/response validation',
          examples: {
            positive:
              'class UserCreate(BaseModel):\n    email: EmailStr\n    password: str',
            negative: 'def create_user(data: dict):\n    email = data["email"]',
            language: 'PYTHON',
          },
        },
        {
          content:
            'Use dependency injection for shared resources like database sessions',
        },
        {
          content: 'Organize routes using APIRouter for modular code',
        },
        {
          content: 'Use async/await for I/O-bound operations',
        },
      ],
    };
  }

  // Java/Kotlin Standards
  private generateJavaKotlinStandard(): IGeneratedStandard {
    return {
      name: 'Java/Kotlin Coding Standards',
      summary:
        'Apply Java/Kotlin best practices for clean and maintainable code',
      description:
        'Standards for writing clean Java or Kotlin code with proper naming, structure, and patterns.',
      rules: [
        {
          content:
            'Use meaningful names: camelCase for methods/variables, PascalCase for classes',
        },
        {
          content:
            'Prefer immutability: use final/val and immutable collections where possible',
          examples: {
            positive: 'val users: List<User> = listOf(user1, user2)',
            negative: 'var users: MutableList<User> = mutableListOf()',
            language: 'KOTLIN',
          },
        },
        {
          content:
            'Use dependency injection instead of creating instances directly',
        },
        {
          content:
            'Follow single responsibility principle - one class, one purpose',
        },
      ],
    };
  }

  private generateSpringBootStandard(): IGeneratedStandard {
    return {
      name: 'Spring Boot Architecture Standards',
      summary: 'Apply Spring Boot best practices for enterprise applications',
      description:
        'Standards for building Spring Boot applications with proper layering, dependency injection, and configuration.',
      rules: [
        {
          content:
            'Use constructor injection over field injection for dependencies',
          examples: {
            positive:
              '@Service\nclass UserService(private val userRepo: UserRepository)',
            negative:
              '@Service\nclass UserService {\n    @Autowired\n    private lateinit var userRepo: UserRepository\n}',
            language: 'KOTLIN',
          },
        },
        {
          content:
            'Organize code in layers: Controller -> Service -> Repository',
        },
        {
          content: 'Use DTOs to separate API contracts from domain entities',
        },
        {
          content: 'Externalize configuration using @ConfigurationProperties',
        },
      ],
    };
  }

  // C# Standards
  private generateCSharpStandard(): IGeneratedStandard {
    return {
      name: 'C# Coding Standards',
      summary: 'Apply C# best practices following Microsoft guidelines',
      description:
        'Standards for writing clean, maintainable C# code with proper naming, patterns, and modern features.',
      rules: [
        {
          content:
            'Use PascalCase for public members, camelCase for private fields with underscore prefix',
          examples: {
            positive:
              'public class UserService\n{\n    private readonly IUserRepository _userRepository;\n    public User GetUser(int id) { }\n}',
            negative:
              'public class userService\n{\n    private IUserRepository userRepository;\n    public User getUser(int id) { }\n}',
            language: 'CSHARP',
          },
        },
        {
          content:
            'Use async/await for I/O operations with Async suffix on method names',
          examples: {
            positive: 'public async Task<User> GetUserAsync(int id)',
            negative: 'public User GetUser(int id) // blocking I/O',
            language: 'CSHARP',
          },
        },
        {
          content:
            'Prefer interfaces for dependencies to enable testing and flexibility',
        },
        {
          content: 'Use nullable reference types and handle nulls explicitly',
        },
      ],
    };
  }

  private generateAspNetCoreStandard(): IGeneratedStandard {
    return {
      name: 'ASP.NET Core Architecture Standards',
      summary: 'Apply ASP.NET Core best practices for web API development',
      description:
        'Standards for building ASP.NET Core applications with proper dependency injection, middleware, and API design.',
      rules: [
        {
          content: 'Use dependency injection via constructor for all services',
        },
        {
          content:
            'Organize code using the Clean Architecture pattern with separate projects',
        },
        {
          content:
            'Use DTOs with data annotations or FluentValidation for request validation',
        },
        {
          content:
            'Implement global exception handling middleware for consistent error responses',
        },
      ],
    };
  }

  // Go Standards
  private generateGoStandard(): IGeneratedStandard {
    return {
      name: 'Go Coding Standards',
      summary: 'Apply Go best practices following Effective Go guidelines',
      description:
        'Standards for writing idiomatic Go code with proper naming, error handling, and package structure.',
      rules: [
        {
          content:
            'Use short, concise names: i for index, err for errors, ctx for context',
          examples: {
            positive:
              'func (s *UserService) GetUser(ctx context.Context, id int) (*User, error)',
            negative:
              'func (userService *UserService) GetUserById(context context.Context, userId int) (*User, error)',
            language: 'GO',
          },
        },
        {
          content: 'Handle errors explicitly - never ignore returned errors',
          examples: {
            positive:
              'user, err := s.repo.Find(id)\nif err != nil {\n    return nil, fmt.Errorf("finding user: %w", err)\n}',
            negative: 'user, _ := s.repo.Find(id)',
            language: 'GO',
          },
        },
        {
          content:
            'Use interfaces for dependencies, define them where they are used',
        },
        {
          content:
            'Organize packages by domain, not by layer (no /models, /controllers folders)',
        },
      ],
    };
  }
}
