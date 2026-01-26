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
}
