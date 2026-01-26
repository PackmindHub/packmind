import { IProjectScanResult } from './ProjectScannerService';

export interface IGeneratedSkill {
  name: string;
  description: string;
  prompt: string;
}

export interface ISkillsGeneratorService {
  generateSkills(scanResult: IProjectScanResult): IGeneratedSkill[];
}

export class SkillsGeneratorService implements ISkillsGeneratorService {
  generateSkills(scanResult: IProjectScanResult): IGeneratedSkill[] {
    const skills: IGeneratedSkill[] = [];

    if (scanResult.testFramework) {
      skills.push(this.generateDebuggingSkill(scanResult.testFramework));
    }

    if (scanResult.frameworks.includes('NestJS')) {
      skills.push(this.generateNestJSDebuggingSkill());
    }

    if (scanResult.structure.isMonorepo) {
      skills.push(this.generateMonorepoNavigationSkill());
    }

    // Python
    if (scanResult.languages.includes('Python')) {
      skills.push(this.generatePythonDebuggingSkill());
    }

    if (scanResult.frameworks.includes('Django')) {
      skills.push(this.generateDjangoDebuggingSkill());
    }

    // Java/Kotlin
    if (scanResult.frameworks.includes('Spring Boot')) {
      skills.push(this.generateSpringBootDebuggingSkill());
    }

    // C#
    if (scanResult.frameworks.includes('ASP.NET Core')) {
      skills.push(this.generateAspNetCoreDebuggingSkill());
    }

    // Go
    if (scanResult.languages.includes('Go')) {
      skills.push(this.generateGoDebuggingSkill());
    }

    return skills;
  }

  private generateDebuggingSkill(testFramework: string): IGeneratedSkill {
    return {
      name: 'debugging-with-' + testFramework,
      description: `Systematic debugging workflow using ${testFramework} tests`,
      prompt: `# Debugging with ${testFramework}

When encountering bugs or test failures:

1. **Reproduce**: Write a failing test that demonstrates the bug
2. **Isolate**: Run only the failing test to isolate the issue
3. **Investigate**: Add console.logs or use debugger to inspect state
4. **Fix**: Make minimal changes to fix the issue
5. **Verify**: Ensure the test passes and no other tests broke
6. **Cleanup**: Remove debug code and commit

Always run tests before claiming a fix is complete.`,
    };
  }

  private generateNestJSDebuggingSkill(): IGeneratedSkill {
    return {
      name: 'nestjs-debugging',
      description:
        'Debug NestJS applications with proper logging and error handling',
      prompt: `# NestJS Debugging

When debugging NestJS applications:

1. Check dependency injection - ensure providers are registered in module
2. Verify middleware and guards are applied in correct order
3. Use NestJS Logger for structured logging
4. Check request/response interceptors for transformations
5. Verify TypeORM queries with query logging enabled
6. Test endpoints with proper authentication headers

Common issues:
- Missing @Injectable() decorator
- Circular dependencies between modules
- Missing imports in module metadata`,
    };
  }

  private generateMonorepoNavigationSkill(): IGeneratedSkill {
    return {
      name: 'monorepo-navigation',
      description: 'Navigate and work efficiently in monorepo structure',
      prompt: `# Monorepo Navigation

Working in a monorepo:

1. **Find code**: Use workspace-wide search instead of grepping single directories
2. **Run commands**: Use workspace commands (e.g., npm run build --workspace=@org/package)
3. **Understand dependencies**: Check package.json workspaces field for internal deps
4. **Make changes**: Consider impact across all packages before modifying shared code
5. **Test locally**: Run tests for affected packages after changes

Commands:
- List packages: npm ls --depth=0
- Run in specific package: npm run [cmd] --workspace=[name]
- Build all: npm run build --workspaces`,
    };
  }

  // Python Skills
  private generatePythonDebuggingSkill(): IGeneratedSkill {
    return {
      name: 'python-debugging',
      description: 'Debug Python applications with pdb and logging',
      prompt: `# Python Debugging

When debugging Python applications:

1. **Use breakpoints**: Insert \`breakpoint()\` or \`import pdb; pdb.set_trace()\`
2. **Enable logging**: Configure logging with appropriate levels
3. **Check types**: Use \`type()\` and \`isinstance()\` to verify types at runtime
4. **Inspect objects**: Use \`dir()\`, \`vars()\`, and \`__dict__\` to explore objects
5. **Use pytest**: Run specific tests with \`pytest -xvs test_file.py::test_name\`

Common issues:
- Import errors: Check PYTHONPATH and package structure
- None values: Add null checks and use Optional type hints
- Async issues: Ensure await is used with async functions

Useful commands:
- \`python -m pdb script.py\` - Start debugger
- \`pytest --pdb\` - Drop into debugger on failure
- \`python -c "import module; print(module.__file__)"\` - Find module location`,
    };
  }

  private generateDjangoDebuggingSkill(): IGeneratedSkill {
    return {
      name: 'django-debugging',
      description:
        'Debug Django applications with Django Debug Toolbar and logging',
      prompt: `# Django Debugging

When debugging Django applications:

1. **Enable DEBUG mode**: Set DEBUG=True in development settings
2. **Use Django Debug Toolbar**: Install and configure for request inspection
3. **Check ORM queries**: Use \`queryset.query\` to see generated SQL
4. **Review migrations**: Run \`python manage.py showmigrations\`
5. **Test views**: Use Django test client or pytest-django

Common issues:
- N+1 queries: Use select_related() and prefetch_related()
- Missing migrations: Run makemigrations and check for model changes
- Template errors: Check context variables and template inheritance
- URL routing: Use \`python manage.py show_urls\` (with django-extensions)

Useful commands:
- \`python manage.py shell_plus\` - Enhanced Django shell
- \`python manage.py dbshell\` - Database shell
- \`python manage.py check\` - Run system checks`,
    };
  }

  // Spring Boot Skills
  private generateSpringBootDebuggingSkill(): IGeneratedSkill {
    return {
      name: 'spring-boot-debugging',
      description: 'Debug Spring Boot applications with Actuator and logging',
      prompt: `# Spring Boot Debugging

When debugging Spring Boot applications:

1. **Enable debug logging**: Set \`logging.level.org.springframework=DEBUG\`
2. **Use Actuator**: Enable /actuator endpoints for health and metrics
3. **Check bean creation**: Review application startup logs for bean issues
4. **Verify properties**: Use /actuator/env to check configuration
5. **Test with MockMvc**: Write integration tests for controllers

Common issues:
- Bean not found: Check @Component annotations and component scan
- Circular dependencies: Refactor or use @Lazy
- Transaction issues: Verify @Transactional placement and propagation
- Property binding: Check @ConfigurationProperties and property names

Useful commands:
- \`./gradlew bootRun --debug-jvm\` - Remote debugging
- \`curl localhost:8080/actuator/health\` - Check health
- \`curl localhost:8080/actuator/beans\` - List all beans`,
    };
  }

  // ASP.NET Core Skills
  private generateAspNetCoreDebuggingSkill(): IGeneratedSkill {
    return {
      name: 'aspnet-core-debugging',
      description:
        'Debug ASP.NET Core applications with logging and diagnostics',
      prompt: `# ASP.NET Core Debugging

When debugging ASP.NET Core applications:

1. **Enable detailed errors**: Set ASPNETCORE_ENVIRONMENT=Development
2. **Configure logging**: Use ILogger<T> with appropriate log levels
3. **Check DI container**: Verify service registrations in Program.cs
4. **Use middleware diagnostics**: Add UseDeveloperExceptionPage()
5. **Test with WebApplicationFactory**: Write integration tests

Common issues:
- DI resolution failure: Check service lifetime (Scoped vs Singleton)
- Null reference: Enable nullable reference types and check for null
- Configuration binding: Verify appsettings.json structure and IOptions<T>
- EF Core issues: Enable sensitive data logging for query debugging

Useful commands:
- \`dotnet watch run\` - Hot reload development
- \`dotnet ef migrations list\` - Check EF migrations
- \`dotnet user-secrets list\` - View user secrets`,
    };
  }

  // Go Skills
  private generateGoDebuggingSkill(): IGeneratedSkill {
    return {
      name: 'go-debugging',
      description: 'Debug Go applications with Delve and logging',
      prompt: `# Go Debugging

When debugging Go applications:

1. **Use Delve debugger**: \`dlv debug\` or \`dlv test\`
2. **Add logging**: Use \`log\` package or structured logging (zap, zerolog)
3. **Check errors**: Always handle returned errors explicitly
4. **Use race detector**: Run with \`go run -race\` or \`go test -race\`
5. **Profile performance**: Use \`go tool pprof\`

Common issues:
- Nil pointer dereference: Check pointers before dereferencing
- Goroutine leaks: Use context cancellation and proper cleanup
- Race conditions: Use mutexes or channels for shared state
- Import cycles: Reorganize packages to break circular dependencies

Useful commands:
- \`dlv debug ./cmd/app\` - Start debugger
- \`go test -v -run TestName\` - Run specific test
- \`go build -gcflags="-m"\` - See escape analysis
- \`go vet ./...\` - Static analysis
- \`golangci-lint run\` - Comprehensive linting`,
    };
  }
}
