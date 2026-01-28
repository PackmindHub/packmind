import * as crypto from 'crypto';
import {
  IBaselineItem,
  BaselineItemType,
  ConfidenceLevel,
} from '../../domain/types/OnboardingDraft';
import { IProjectScanResult } from './ProjectScannerService';

interface IRawBaselineItem {
  label: string;
  type: BaselineItemType;
  confidence: ConfidenceLevel;
  candidateEvidence: string[]; // Candidate files/dirs to check against scan result
}

export class BaselineItemGeneratorService {
  private readonly MAX_ITEMS = 10;

  generateBaselineItems(scanResult: IProjectScanResult): IBaselineItem[] {
    const detectedFilesSet = new Set(scanResult.detectedFiles);
    const detectedDirsSet = new Set(scanResult.detectedDirectories);

    const rawItems = this.collectRawItems(scanResult);

    // Filter evidence to only verified files/directories
    const itemsWithVerifiedEvidence = rawItems
      .map((item) => ({
        ...item,
        evidence: this.filterEvidence(
          item.candidateEvidence,
          detectedFilesSet,
          detectedDirsSet,
        ),
      }))
      .filter((item) => item.evidence.length > 0); // Exclude items with no valid evidence

    const sortedItems = this.sortByConfidence(itemsWithVerifiedEvidence);
    const cappedItems = this.capItems(sortedItems);

    return cappedItems.map((item) => ({
      id: this.generateStableId(item),
      label: item.label,
      type: item.type,
      confidence: item.confidence,
      evidence: item.evidence,
    }));
  }

  private filterEvidence(
    candidates: string[],
    detectedFiles: Set<string>,
    detectedDirs: Set<string>,
  ): string[] {
    return candidates.filter((candidate) => {
      // Check if it's a directory (ends with /)
      if (candidate.endsWith('/')) {
        const dirName = candidate.slice(0, -1);
        return detectedDirs.has(dirName);
      }
      // Check if it's a file
      return detectedFiles.has(candidate);
    });
  }

  private collectRawItems(scanResult: IProjectScanResult): IRawBaselineItem[] {
    const items: IRawBaselineItem[] = [];

    // Languages (high confidence - detected from config files)
    if (scanResult.hasTypeScript) {
      items.push({
        label: 'Uses TypeScript',
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: ['tsconfig.json', 'tsconfig.base.json'],
      });
    }

    if (
      scanResult.languages.includes('JavaScript') &&
      !scanResult.hasTypeScript
    ) {
      items.push({
        label: 'Uses JavaScript',
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: ['package.json'],
      });
    }

    if (scanResult.languages.includes('Python')) {
      items.push({
        label: 'Uses Python',
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: [
          'requirements.txt',
          'pyproject.toml',
          'setup.py',
          'Pipfile',
        ],
      });
    }

    if (scanResult.languages.includes('Go')) {
      items.push({
        label: 'Uses Go',
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: ['go.mod'],
      });
    }

    if (scanResult.languages.includes('Java')) {
      items.push({
        label: 'Uses Java',
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
      });
    }

    if (scanResult.languages.includes('C#')) {
      items.push({
        label: 'Uses C#',
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: ['*.csproj', '*.sln'], // Will be filtered out if not in detectedFiles
      });
    }

    if (scanResult.languages.includes('Rust')) {
      items.push({
        label: 'Uses Rust',
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: ['Cargo.toml'],
      });
    }

    if (scanResult.languages.includes('PHP')) {
      items.push({
        label: 'Uses PHP',
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: ['composer.json'],
      });
    }

    if (scanResult.languages.includes('Ruby')) {
      items.push({
        label: 'Uses Ruby',
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: ['Gemfile', 'Rakefile'],
      });
    }

    // Frameworks (high confidence - detected from dependencies)
    for (const framework of scanResult.frameworks) {
      items.push({
        label: `Uses ${framework}`,
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: [
          'package.json',
          'composer.json',
          'Gemfile',
          'requirements.txt',
          'pyproject.toml',
          'pom.xml',
          'build.gradle',
          'go.mod',
          'Cargo.toml',
        ],
      });
    }

    // Tools (high confidence)
    if (scanResult.hasLinting) {
      items.push({
        label: 'Uses ESLint for linting',
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: [
          '.eslintrc.js',
          '.eslintrc.json',
          '.eslintrc.cjs',
          '.eslintrc.yaml',
          '.eslintrc.yml',
          'eslint.config.js',
          'eslint.config.mjs',
        ],
      });
    }

    if (scanResult.tools.includes('Prettier')) {
      items.push({
        label: 'Uses Prettier for formatting',
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: [
          '.prettierrc',
          '.prettierrc.json',
          '.prettierrc.js',
          '.prettierrc.yaml',
          'prettier.config.js',
        ],
      });
    }

    if (scanResult.tools.includes('Nx')) {
      items.push({
        label: 'Uses Nx build system',
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: ['nx.json'],
      });
    }

    if (scanResult.tools.includes('Turbo')) {
      items.push({
        label: 'Uses Turborepo',
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: ['turbo.json'],
      });
    }

    // Test framework
    if (scanResult.testFramework) {
      const testConfigFiles = this.getTestConfigFiles(scanResult.testFramework);
      items.push({
        label: `Uses ${this.formatFrameworkName(scanResult.testFramework)} for testing`,
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: testConfigFiles,
      });
    }

    // Package manager
    if (scanResult.packageManager) {
      const lockFile = this.getLockFile(scanResult.packageManager);
      items.push({
        label: `Uses ${scanResult.packageManager} package manager`,
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: [lockFile],
      });
    }

    // Structure (uses directories)
    if (scanResult.structure.isMonorepo) {
      items.push({
        label: 'Monorepo structure',
        type: 'structure',
        confidence: 'high',
        candidateEvidence: ['packages/', 'apps/', 'services/', 'libs/'],
      });
    }

    if (scanResult.structure.hasTests) {
      items.push({
        label: 'Has test directory',
        type: 'structure',
        confidence: 'medium',
        candidateEvidence: ['test/', 'tests/', '__tests__/', 'spec/'],
      });
    }

    if (scanResult.structure.hasSrcDirectory) {
      items.push({
        label: 'Uses src/ directory structure',
        type: 'structure',
        confidence: 'medium',
        candidateEvidence: ['src/'],
      });
    }

    return items;
  }

  private getTestConfigFiles(testFramework: string): string[] {
    const configMap: Record<string, string[]> = {
      jest: ['jest.config.js', 'jest.config.ts', 'jest.config.json'],
      vitest: [
        'vitest.config.js',
        'vitest.config.ts',
        'vite.config.js',
        'vite.config.ts',
      ],
      mocha: ['.mocharc.js', '.mocharc.json', '.mocharc.yaml'],
      pytest: ['pytest.ini', 'pyproject.toml', 'setup.cfg'],
    };
    return configMap[testFramework.toLowerCase()] || ['package.json'];
  }

  private getLockFile(packageManager: string): string {
    const lockFiles: Record<string, string> = {
      npm: 'package-lock.json',
      yarn: 'yarn.lock',
      pnpm: 'pnpm-lock.yaml',
    };
    return lockFiles[packageManager] || 'package.json';
  }

  private sortByConfidence(
    items: { confidence: ConfidenceLevel }[],
  ): (IRawBaselineItem & { evidence: string[] })[] {
    return [...items].sort((a, b) => {
      if (a.confidence === 'high' && b.confidence === 'medium') return -1;
      if (a.confidence === 'medium' && b.confidence === 'high') return 1;
      return 0;
    }) as (IRawBaselineItem & { evidence: string[] })[];
  }

  private capItems<T>(items: T[]): T[] {
    return items.slice(0, this.MAX_ITEMS);
  }

  private generateStableId(item: {
    type: string;
    label: string;
    evidence: string[];
  }): string {
    const content = `${item.type}:${item.label}:${item.evidence.sort().join(',')}`;
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex')
      .slice(0, 12);
  }

  private formatFrameworkName(name: string): string {
    const nameMap: Record<string, string> = {
      nestjs: 'NestJS',
      nextjs: 'Next.js',
      'next.js': 'Next.js',
      react: 'React',
      vue: 'Vue',
      angular: 'Angular',
      express: 'Express',
      django: 'Django',
      fastapi: 'FastAPI',
      jest: 'Jest',
      vitest: 'Vitest',
      mocha: 'Mocha',
      pytest: 'pytest',
    };
    return nameMap[name.toLowerCase()] || name;
  }
}
