import * as fs from 'fs/promises';
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
    await this.detectLanguages(projectPath, result);

    // Detect frameworks and tools from package.json (JavaScript/Node.js)
    await this.detectFromPackageJson(projectPath, result);

    // Detect Python ecosystem
    await this.detectPythonEcosystem(projectPath, result);

    // Detect Java/Kotlin ecosystem
    await this.detectJavaEcosystem(projectPath, result);

    // Detect Go ecosystem
    await this.detectGoEcosystem(projectPath, result);

    // Detect Rust ecosystem
    await this.detectRustEcosystem(projectPath, result);

    // Detect PHP ecosystem
    await this.detectPhpEcosystem(projectPath, result);

    // Detect Ruby ecosystem
    await this.detectRubyEcosystem(projectPath, result);

    // Detect .NET ecosystem
    await this.detectDotNetEcosystem(projectPath, result);

    // Detect monorepo structure
    await this.detectMonorepoStructure(projectPath, result);

    // Detect package manager
    await this.detectPackageManager(projectPath, result);

    // Detect structure details
    await this.detectStructureDetails(projectPath, result);

    // Detect tools from config files
    await this.detectToolsFromConfigFiles(projectPath, result);

    // Set hasTypeScript flag (check for tsconfig.json or tsconfig.base.json)
    result.hasTypeScript =
      (await this.fileExists(path.join(projectPath, 'tsconfig.json'))) ||
      (await this.fileExists(path.join(projectPath, 'tsconfig.base.json')));

    // Set hasLinting flag
    result.hasLinting =
      result.tools.includes('ESLint') ||
      result.tools.includes('Pylint') ||
      result.tools.includes('Black') ||
      result.tools.includes('Mypy');

    return result;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async detectLanguages(
    projectPath: string,
    result: IProjectScanResult,
  ): Promise<void> {
    // TypeScript (check for tsconfig.json or tsconfig.base.json for monorepos)
    if (
      (await this.fileExists(path.join(projectPath, 'tsconfig.json'))) ||
      (await this.fileExists(path.join(projectPath, 'tsconfig.base.json')))
    ) {
      result.languages.push('TypeScript');
    }

    // JavaScript
    if (await this.fileExists(path.join(projectPath, 'package.json'))) {
      result.languages.push('JavaScript');
    }

    // Python
    if (
      (await this.fileExists(path.join(projectPath, 'requirements.txt'))) ||
      (await this.fileExists(path.join(projectPath, 'setup.py'))) ||
      (await this.fileExists(path.join(projectPath, 'pyproject.toml'))) ||
      (await this.fileExists(path.join(projectPath, 'Pipfile')))
    ) {
      result.languages.push('Python');
    }

    // Java/Kotlin
    if (
      (await this.fileExists(path.join(projectPath, 'pom.xml'))) ||
      (await this.fileExists(path.join(projectPath, 'build.gradle'))) ||
      (await this.fileExists(path.join(projectPath, 'build.gradle.kts')))
    ) {
      result.languages.push('Java');
    }

    // Go
    if (await this.fileExists(path.join(projectPath, 'go.mod'))) {
      result.languages.push('Go');
    }

    // Rust
    if (await this.fileExists(path.join(projectPath, 'Cargo.toml'))) {
      result.languages.push('Rust');
    }

    // PHP
    if (await this.fileExists(path.join(projectPath, 'composer.json'))) {
      result.languages.push('PHP');
    }

    // Ruby
    if (
      (await this.fileExists(path.join(projectPath, 'Gemfile'))) ||
      (await this.fileExists(path.join(projectPath, 'Rakefile')))
    ) {
      result.languages.push('Ruby');
    }

    // C# (.NET)
    if (
      (await this.hasFilesWithExtension(projectPath, '.csproj')) ||
      (await this.hasFilesWithExtension(projectPath, '.sln'))
    ) {
      result.languages.push('C#');
    }
  }

  private async hasFilesWithExtension(
    dirPath: string,
    extension: string,
  ): Promise<boolean> {
    try {
      const entries = await fs.readdir(dirPath);
      return entries.some((entry) => entry.endsWith(extension));
    } catch {
      return false;
    }
  }

  private async detectFromPackageJson(
    projectPath: string,
    result: IProjectScanResult,
  ): Promise<void> {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!(await this.fileExists(packageJsonPath))) {
      return;
    }

    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);
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

  private async detectPythonEcosystem(
    projectPath: string,
    result: IProjectScanResult,
  ): Promise<void> {
    // Check requirements.txt
    const requirementsPath = path.join(projectPath, 'requirements.txt');
    if (await this.fileExists(requirementsPath)) {
      try {
        const content = (
          await fs.readFile(requirementsPath, 'utf-8')
        ).toLowerCase();

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
    if (await this.fileExists(pyprojectPath)) {
      try {
        const content = (
          await fs.readFile(pyprojectPath, 'utf-8')
        ).toLowerCase();

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
    if (await this.fileExists(pipfilePath)) {
      try {
        const content = (await fs.readFile(pipfilePath, 'utf-8')).toLowerCase();

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

  private async detectJavaEcosystem(
    projectPath: string,
    result: IProjectScanResult,
  ): Promise<void> {
    // Check pom.xml (Maven)
    const pomPath = path.join(projectPath, 'pom.xml');
    if (await this.fileExists(pomPath)) {
      try {
        const content = (await fs.readFile(pomPath, 'utf-8')).toLowerCase();

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
    const hasGradle = await this.fileExists(gradlePath);
    const hasGradleKts = await this.fileExists(gradleKtsPath);
    if (hasGradle || hasGradleKts) {
      try {
        const filePath = hasGradle ? gradlePath : gradleKtsPath;
        const content = (await fs.readFile(filePath, 'utf-8')).toLowerCase();

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

  private async detectGoEcosystem(
    projectPath: string,
    result: IProjectScanResult,
  ): Promise<void> {
    const goModPath = path.join(projectPath, 'go.mod');
    if (!(await this.fileExists(goModPath))) {
      return;
    }

    try {
      const content = (await fs.readFile(goModPath, 'utf-8')).toLowerCase();

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

  private async detectRustEcosystem(
    projectPath: string,
    result: IProjectScanResult,
  ): Promise<void> {
    const cargoTomlPath = path.join(projectPath, 'Cargo.toml');
    if (!(await this.fileExists(cargoTomlPath))) {
      return;
    }

    try {
      const content = (await fs.readFile(cargoTomlPath, 'utf-8')).toLowerCase();

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

  private async detectPhpEcosystem(
    projectPath: string,
    result: IProjectScanResult,
  ): Promise<void> {
    const composerJsonPath = path.join(projectPath, 'composer.json');
    if (!(await this.fileExists(composerJsonPath))) {
      return;
    }

    try {
      const content = await fs.readFile(composerJsonPath, 'utf-8');
      const composerJson = JSON.parse(content);
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

  private async detectRubyEcosystem(
    projectPath: string,
    result: IProjectScanResult,
  ): Promise<void> {
    const gemfilePath = path.join(projectPath, 'Gemfile');
    if (!(await this.fileExists(gemfilePath))) {
      return;
    }

    try {
      const content = (await fs.readFile(gemfilePath, 'utf-8')).toLowerCase();

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

  private async detectDotNetEcosystem(
    projectPath: string,
    result: IProjectScanResult,
  ): Promise<void> {
    // Look for .csproj files
    try {
      const entries = await fs.readdir(projectPath);
      const csprojFiles = entries.filter((e) => e.endsWith('.csproj'));

      for (const csprojFile of csprojFiles) {
        const csprojPath = path.join(projectPath, csprojFile);
        const content = (await fs.readFile(csprojPath, 'utf-8')).toLowerCase();

        // Detect frameworks
        if (
          content.includes('microsoft.aspnetcore') ||
          content.includes('aspnetcore')
        ) {
          result.frameworks.push('ASP.NET Core');
        }
        if (content.includes('microsoft.entityframeworkcore')) {
          result.tools.push('Entity Framework Core');
        }
        if (content.includes('xunit')) {
          result.testFramework = result.testFramework || 'xUnit';
        }
        if (content.includes('nunit')) {
          result.testFramework = result.testFramework || 'NUnit';
        }
        if (content.includes('mstest')) {
          result.testFramework = result.testFramework || 'MSTest';
        }
      }

      // Detect tools
      result.tools.push('.NET CLI');
    } catch {
      // Ignore read errors
    }

    // Deduplicate frameworks and tools
    result.frameworks = [...new Set(result.frameworks)];
    result.tools = [...new Set(result.tools)];
  }

  private async detectMonorepoStructure(
    projectPath: string,
    result: IProjectScanResult,
  ): Promise<void> {
    const packagesDir = path.join(projectPath, 'packages');
    const appsDir = path.join(projectPath, 'apps');

    const hasPackagesDir = await this.isDirectory(packagesDir);
    const hasAppsDir = await this.isDirectory(appsDir);

    if (hasPackagesDir || hasAppsDir) {
      result.structure.isMonorepo = true;
    }
  }

  private async isDirectory(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  private async detectPackageManager(
    projectPath: string,
    result: IProjectScanResult,
  ): Promise<void> {
    if (await this.fileExists(path.join(projectPath, 'pnpm-lock.yaml'))) {
      result.packageManager = 'pnpm';
    } else if (await this.fileExists(path.join(projectPath, 'yarn.lock'))) {
      result.packageManager = 'yarn';
    } else if (
      await this.fileExists(path.join(projectPath, 'package-lock.json'))
    ) {
      result.packageManager = 'npm';
    }
  }

  private async detectStructureDetails(
    projectPath: string,
    result: IProjectScanResult,
  ): Promise<void> {
    // Detect src directory
    const srcDir = path.join(projectPath, 'src');
    if (await this.isDirectory(srcDir)) {
      result.structure.hasSrcDirectory = true;
    }

    // Detect test directories
    const testDirs = ['test', 'tests', '__tests__'];
    for (const testDir of testDirs) {
      const fullPath = path.join(projectPath, testDir);
      if (await this.isDirectory(fullPath)) {
        result.structure.hasTests = true;
        break;
      }
    }
  }

  private async detectToolsFromConfigFiles(
    projectPath: string,
    result: IProjectScanResult,
  ): Promise<void> {
    try {
      // Nx
      if (await this.fileExists(path.join(projectPath, 'nx.json'))) {
        if (!result.tools.includes('Nx')) {
          result.tools.push('Nx');
        }
      }

      // Turbo
      if (await this.fileExists(path.join(projectPath, 'turbo.json'))) {
        if (!result.tools.includes('Turbo')) {
          result.tools.push('Turbo');
        }
      }
    } catch {
      // Ignore file system errors
    }
  }
}
