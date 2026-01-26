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
}
