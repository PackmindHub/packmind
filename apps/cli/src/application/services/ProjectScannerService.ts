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
  hasTypeScript: boolean;
  hasLinting: boolean;
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
      hasTypeScript: false,
      hasLinting: false,
    };

    // Detect languages
    this.detectLanguages(projectPath, result);

    // Detect frameworks and tools from package.json (JavaScript/Node.js)
    this.detectFromPackageJson(projectPath, result);

    // Detect Python ecosystem
    this.detectPythonEcosystem(projectPath, result);

    // Detect Java/Kotlin ecosystem
    this.detectJavaEcosystem(projectPath, result);

    // Detect Go ecosystem
    this.detectGoEcosystem(projectPath, result);

    // Detect Rust ecosystem
    this.detectRustEcosystem(projectPath, result);

    // Detect PHP ecosystem
    this.detectPhpEcosystem(projectPath, result);

    // Detect Ruby ecosystem
    this.detectRubyEcosystem(projectPath, result);

    // Detect monorepo structure
    this.detectMonorepoStructure(projectPath, result);

    // Detect package manager
    this.detectPackageManager(projectPath, result);

    // Detect structure details
    this.detectStructureDetails(projectPath, result);

    // Detect tools from config files
    this.detectToolsFromConfigFiles(projectPath, result);

    // Set hasTypeScript flag
    result.hasTypeScript = fs.existsSync(
      path.join(projectPath, 'tsconfig.json'),
    );

    // Set hasLinting flag
    result.hasLinting =
      result.tools.includes('ESLint') ||
      result.tools.includes('Pylint') ||
      result.tools.includes('Black') ||
      result.tools.includes('Mypy');

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
      fs.existsSync(path.join(projectPath, 'pyproject.toml')) ||
      fs.existsSync(path.join(projectPath, 'Pipfile'))
    ) {
      result.languages.push('Python');
    }

    // Java/Kotlin
    if (
      fs.existsSync(path.join(projectPath, 'pom.xml')) ||
      fs.existsSync(path.join(projectPath, 'build.gradle')) ||
      fs.existsSync(path.join(projectPath, 'build.gradle.kts'))
    ) {
      result.languages.push('Java');
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

    // Ruby
    if (
      fs.existsSync(path.join(projectPath, 'Gemfile')) ||
      fs.existsSync(path.join(projectPath, 'Rakefile'))
    ) {
      result.languages.push('Ruby');
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
    } catch {
      // Ignore parse errors
    }
  }

  private detectPythonEcosystem(
    projectPath: string,
    result: IProjectScanResult,
  ): void {
    // Check requirements.txt
    const requirementsPath = path.join(projectPath, 'requirements.txt');
    if (fs.existsSync(requirementsPath)) {
      try {
        const content = fs
          .readFileSync(requirementsPath, 'utf-8')
          .toLowerCase();

        // Detect frameworks
        if (content.includes('django')) {
          result.frameworks.push('Django');
        }
        if (content.includes('flask')) {
          result.frameworks.push('Flask');
        }
        if (content.includes('fastapi')) {
          result.frameworks.push('FastAPI');
        }
        if (content.includes('pytest')) {
          result.testFramework = result.testFramework || 'pytest';
        }

        // Detect tools
        if (content.includes('pylint')) {
          result.tools.push('Pylint');
        }
        if (content.includes('black')) {
          result.tools.push('Black');
        }
        if (content.includes('mypy')) {
          result.tools.push('Mypy');
        }
      } catch {
        // Ignore read errors
      }
    }

    // Check pyproject.toml
    const pyprojectPath = path.join(projectPath, 'pyproject.toml');
    if (fs.existsSync(pyprojectPath)) {
      try {
        const content = fs.readFileSync(pyprojectPath, 'utf-8').toLowerCase();

        // Detect frameworks
        if (content.includes('django')) {
          result.frameworks.push('Django');
        }
        if (content.includes('flask')) {
          result.frameworks.push('Flask');
        }
        if (content.includes('fastapi')) {
          result.frameworks.push('FastAPI');
        }
        if (content.includes('pytest')) {
          result.testFramework = result.testFramework || 'pytest';
        }

        // Detect tools
        if (content.includes('poetry')) {
          result.tools.push('Poetry');
        }
        if (content.includes('pylint')) {
          result.tools.push('Pylint');
        }
        if (content.includes('black')) {
          result.tools.push('Black');
        }
        if (content.includes('mypy')) {
          result.tools.push('Mypy');
        }
      } catch {
        // Ignore read errors
      }
    }

    // Check Pipfile
    const pipfilePath = path.join(projectPath, 'Pipfile');
    if (fs.existsSync(pipfilePath)) {
      try {
        const content = fs.readFileSync(pipfilePath, 'utf-8').toLowerCase();

        // Detect frameworks
        if (content.includes('django')) {
          result.frameworks.push('Django');
        }
        if (content.includes('flask')) {
          result.frameworks.push('Flask');
        }
        if (content.includes('fastapi')) {
          result.frameworks.push('FastAPI');
        }
        if (content.includes('pytest')) {
          result.testFramework = result.testFramework || 'pytest';
        }
      } catch {
        // Ignore read errors
      }
    }

    // Deduplicate frameworks and tools
    result.frameworks = [...new Set(result.frameworks)];
    result.tools = [...new Set(result.tools)];
  }

  private detectJavaEcosystem(
    projectPath: string,
    result: IProjectScanResult,
  ): void {
    // Check pom.xml (Maven)
    const pomPath = path.join(projectPath, 'pom.xml');
    if (fs.existsSync(pomPath)) {
      try {
        const content = fs.readFileSync(pomPath, 'utf-8').toLowerCase();

        // Detect frameworks
        if (content.includes('spring-boot')) {
          result.frameworks.push('Spring Boot');
        }
        if (content.includes('quarkus')) {
          result.frameworks.push('Quarkus');
        }
        if (content.includes('micronaut')) {
          result.frameworks.push('Micronaut');
        }
        if (content.includes('junit')) {
          result.testFramework = result.testFramework || 'JUnit';
        }

        // Detect tools
        result.tools.push('Maven');
      } catch {
        // Ignore read errors
      }
    }

    // Check build.gradle or build.gradle.kts (Gradle)
    const gradlePath = path.join(projectPath, 'build.gradle');
    const gradleKtsPath = path.join(projectPath, 'build.gradle.kts');
    if (fs.existsSync(gradlePath) || fs.existsSync(gradleKtsPath)) {
      try {
        const filePath = fs.existsSync(gradlePath) ? gradlePath : gradleKtsPath;
        const content = fs.readFileSync(filePath, 'utf-8').toLowerCase();

        // Detect Kotlin
        if (filePath.endsWith('.kts') || content.includes('kotlin')) {
          if (!result.languages.includes('Kotlin')) {
            result.languages.push('Kotlin');
          }
        }

        // Detect frameworks
        if (content.includes('spring-boot') || content.includes('springboot')) {
          result.frameworks.push('Spring Boot');
        }
        if (content.includes('quarkus')) {
          result.frameworks.push('Quarkus');
        }
        if (content.includes('micronaut')) {
          result.frameworks.push('Micronaut');
        }
        if (content.includes('junit')) {
          result.testFramework = result.testFramework || 'JUnit';
        }

        // Detect tools
        result.tools.push('Gradle');
      } catch {
        // Ignore read errors
      }
    }

    // Deduplicate frameworks and tools
    result.frameworks = [...new Set(result.frameworks)];
    result.tools = [...new Set(result.tools)];
  }

  private detectGoEcosystem(
    projectPath: string,
    result: IProjectScanResult,
  ): void {
    const goModPath = path.join(projectPath, 'go.mod');
    if (!fs.existsSync(goModPath)) {
      return;
    }

    try {
      const content = fs.readFileSync(goModPath, 'utf-8').toLowerCase();

      // Detect frameworks
      if (content.includes('github.com/gin-gonic/gin')) {
        result.frameworks.push('Gin');
      }
      if (content.includes('github.com/labstack/echo')) {
        result.frameworks.push('Echo');
      }
      if (content.includes('github.com/gofiber/fiber')) {
        result.frameworks.push('Fiber');
      }

      // Go test is built-in
      result.testFramework = result.testFramework || 'go test';
    } catch {
      // Ignore read errors
    }

    // Deduplicate frameworks
    result.frameworks = [...new Set(result.frameworks)];
  }

  private detectRustEcosystem(
    projectPath: string,
    result: IProjectScanResult,
  ): void {
    const cargoTomlPath = path.join(projectPath, 'Cargo.toml');
    if (!fs.existsSync(cargoTomlPath)) {
      return;
    }

    try {
      const content = fs.readFileSync(cargoTomlPath, 'utf-8').toLowerCase();

      // Detect frameworks
      if (content.includes('actix-web')) {
        result.frameworks.push('Actix');
      }
      if (content.includes('rocket')) {
        result.frameworks.push('Rocket');
      }
      if (content.includes('axum')) {
        result.frameworks.push('Axum');
      }

      // Detect tools
      result.tools.push('Cargo');
    } catch {
      // Ignore read errors
    }

    // Deduplicate frameworks and tools
    result.frameworks = [...new Set(result.frameworks)];
    result.tools = [...new Set(result.tools)];
  }

  private detectPhpEcosystem(
    projectPath: string,
    result: IProjectScanResult,
  ): void {
    const composerJsonPath = path.join(projectPath, 'composer.json');
    if (!fs.existsSync(composerJsonPath)) {
      return;
    }

    try {
      const composerJson = JSON.parse(
        fs.readFileSync(composerJsonPath, 'utf-8'),
      );
      const allDeps = {
        ...composerJson.require,
        ...composerJson['require-dev'],
      };

      // Detect frameworks
      if (allDeps['laravel/framework']) {
        result.frameworks.push('Laravel');
      }
      if (allDeps['symfony/symfony'] || allDeps['symfony/framework-bundle']) {
        result.frameworks.push('Symfony');
      }
      if (allDeps['wordpress/wordpress'] || allDeps['johnpbloch/wordpress']) {
        result.frameworks.push('WordPress');
      }

      // Detect tools
      result.tools.push('Composer');
      if (allDeps['phpunit/phpunit']) {
        result.testFramework = result.testFramework || 'PHPUnit';
      }
    } catch {
      // Ignore parse errors
    }

    // Deduplicate frameworks and tools
    result.frameworks = [...new Set(result.frameworks)];
    result.tools = [...new Set(result.tools)];
  }

  private detectRubyEcosystem(
    projectPath: string,
    result: IProjectScanResult,
  ): void {
    const gemfilePath = path.join(projectPath, 'Gemfile');
    if (!fs.existsSync(gemfilePath)) {
      return;
    }

    try {
      const content = fs.readFileSync(gemfilePath, 'utf-8').toLowerCase();

      // Detect frameworks
      if (content.includes('rails')) {
        result.frameworks.push('Rails');
      }
      if (content.includes('sinatra')) {
        result.frameworks.push('Sinatra');
      }

      // Detect tools
      result.tools.push('Bundler');
      if (content.includes('rspec')) {
        result.testFramework = result.testFramework || 'RSpec';
      }
    } catch {
      // Ignore read errors
    }

    // Deduplicate frameworks and tools
    result.frameworks = [...new Set(result.frameworks)];
    result.tools = [...new Set(result.tools)];
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
    try {
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
    } catch {
      // Ignore file system errors
    }
  }
}
