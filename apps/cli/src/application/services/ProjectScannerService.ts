import * as fs from 'fs';
import * as path from 'path';

export interface IProjectScanResult {
  languages: string[];
  frameworks: string[];
  tools: string[];
  structure: {
    isMonorepo: boolean;
    hasTests: boolean;
    hasSrcDirectory: boolean;
  };
  testFramework?: string;
  packageManager?: string;
}

export class ProjectScannerService {
  async scanProject(projectPath: string): Promise<IProjectScanResult> {
    const result: IProjectScanResult = {
      languages: [],
      frameworks: [],
      tools: [],
      structure: {
        isMonorepo: false,
        hasTests: false,
        hasSrcDirectory: false,
      },
    };

    // Detect languages
    this.detectLanguages(projectPath, result);

    // Detect frameworks and tools from package.json
    this.detectFromPackageJson(projectPath, result);

    // Detect monorepo structure
    this.detectMonorepoStructure(projectPath, result);

    // Detect package manager
    this.detectPackageManager(projectPath, result);

    // Detect structure details
    this.detectStructureDetails(projectPath, result);

    // Detect tools from config files
    this.detectToolsFromConfigFiles(projectPath, result);

    return result;
  }

  private detectLanguages(
    projectPath: string,
    result: IProjectScanResult,
  ): void {
    // TypeScript
    if (fs.existsSync(path.join(projectPath, 'tsconfig.json'))) {
      result.languages.push('TypeScript');
    }

    // JavaScript
    if (fs.existsSync(path.join(projectPath, 'package.json'))) {
      result.languages.push('JavaScript');
    }

    // Python
    if (
      fs.existsSync(path.join(projectPath, 'requirements.txt')) ||
      fs.existsSync(path.join(projectPath, 'setup.py')) ||
      fs.existsSync(path.join(projectPath, 'pyproject.toml'))
    ) {
      result.languages.push('Python');
    }

    // Go
    if (fs.existsSync(path.join(projectPath, 'go.mod'))) {
      result.languages.push('Go');
    }

    // Rust
    if (fs.existsSync(path.join(projectPath, 'Cargo.toml'))) {
      result.languages.push('Rust');
    }

    // PHP
    if (fs.existsSync(path.join(projectPath, 'composer.json'))) {
      result.languages.push('PHP');
    }
  }

  private detectFromPackageJson(
    projectPath: string,
    result: IProjectScanResult,
  ): void {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      // Detect frameworks
      if (allDeps['@nestjs/core']) {
        result.frameworks.push('NestJS');
      }
      if (allDeps['react']) {
        result.frameworks.push('React');
      }
      if (allDeps['vue']) {
        result.frameworks.push('Vue');
      }
      if (allDeps['@angular/core']) {
        result.frameworks.push('Angular');
      }
      if (allDeps['express']) {
        result.frameworks.push('Express');
      }
      if (allDeps['next']) {
        result.frameworks.push('Next.js');
      }
      if (allDeps['@remix-run/react']) {
        result.frameworks.push('Remix');
      }

      // Detect tools
      if (allDeps['eslint']) {
        result.tools.push('ESLint');
      }
      if (allDeps['prettier']) {
        result.tools.push('Prettier');
      }
      if (allDeps['nx']) {
        result.tools.push('Nx');
      }
      if (allDeps['turbo']) {
        result.tools.push('Turbo');
      }

      // Detect test framework
      if (allDeps['vitest']) {
        result.testFramework = 'vitest';
      } else if (allDeps['jest']) {
        result.testFramework = 'jest';
      } else if (allDeps['mocha']) {
        result.testFramework = 'mocha';
      }
    } catch (error) {
      // Ignore parse errors
    }
  }

  private detectMonorepoStructure(
    projectPath: string,
    result: IProjectScanResult,
  ): void {
    const packagesDir = path.join(projectPath, 'packages');
    const appsDir = path.join(projectPath, 'apps');

    if (
      (fs.existsSync(packagesDir) && fs.statSync(packagesDir).isDirectory()) ||
      (fs.existsSync(appsDir) && fs.statSync(appsDir).isDirectory())
    ) {
      result.structure.isMonorepo = true;
    }
  }

  private detectPackageManager(
    projectPath: string,
    result: IProjectScanResult,
  ): void {
    if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) {
      result.packageManager = 'pnpm';
    } else if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) {
      result.packageManager = 'yarn';
    } else if (fs.existsSync(path.join(projectPath, 'package-lock.json'))) {
      result.packageManager = 'npm';
    }
  }

  private detectStructureDetails(
    projectPath: string,
    result: IProjectScanResult,
  ): void {
    // Detect src directory
    const srcDir = path.join(projectPath, 'src');
    if (fs.existsSync(srcDir) && fs.statSync(srcDir).isDirectory()) {
      result.structure.hasSrcDirectory = true;
    }

    // Detect test directories
    const testDirs = ['test', 'tests', '__tests__'];
    for (const testDir of testDirs) {
      const fullPath = path.join(projectPath, testDir);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        result.structure.hasTests = true;
        break;
      }
    }
  }

  private detectToolsFromConfigFiles(
    projectPath: string,
    result: IProjectScanResult,
  ): void {
    // Nx
    if (fs.existsSync(path.join(projectPath, 'nx.json'))) {
      if (!result.tools.includes('Nx')) {
        result.tools.push('Nx');
      }
    }

    // Turbo
    if (fs.existsSync(path.join(projectPath, 'turbo.json'))) {
      if (!result.tools.includes('Turbo')) {
        result.tools.push('Turbo');
      }
    }
  }
}
