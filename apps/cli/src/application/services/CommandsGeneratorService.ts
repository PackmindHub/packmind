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
}
