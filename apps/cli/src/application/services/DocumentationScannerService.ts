import * as fs from 'fs';
import * as path from 'path';

export interface IExistingDocumentation {
  extractedRules: string[];
  extractedConventions: string[];
  extractedWorkflows: string[];
  sourceFiles: string[];
}

export interface IDocumentationScannerService {
  scanExistingDocumentation(
    projectPath: string,
  ): Promise<IExistingDocumentation>;
  parseRulesFromMarkdown(content: string): string[];
  parseConventionsFromMarkdown(content: string): string[];
  parseWorkflowsFromMarkdown(content: string): string[];
  deduplicateRules(rules: string[]): string[];
}

export class DocumentationScannerService implements IDocumentationScannerService {
  private readonly documentationFiles = [
    'CLAUDE.md',
    '.cursorrules',
    'CONTRIBUTING.md',
    'CONVENTIONS.md',
    'CODE_STYLE.md',
  ];

  private readonly documentationDirs = [
    'docs/standards',
    'docs/conventions',
    '.claude/rules',
    '.packmind/standards',
  ];

  async scanExistingDocumentation(
    projectPath: string,
  ): Promise<IExistingDocumentation> {
    const allRules: string[] = [];
    const allConventions: string[] = [];
    const allWorkflows: string[] = [];
    const sourceFiles: string[] = [];

    // Scan individual documentation files
    for (const file of this.documentationFiles) {
      const filePath = path.join(projectPath, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const rules = this.parseRulesFromMarkdown(content);
        const conventions = this.parseConventionsFromMarkdown(content);
        const workflows = this.parseWorkflowsFromMarkdown(content);

        allRules.push(...rules);
        allConventions.push(...conventions);
        allWorkflows.push(...workflows);
        sourceFiles.push(filePath);
      }
    }

    // Scan documentation directories
    for (const dir of this.documentationDirs) {
      const dirPath = path.join(projectPath, dir);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          if (fs.statSync(filePath).isFile() && file.endsWith('.md')) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const rules = this.parseRulesFromMarkdown(content);
            const conventions = this.parseConventionsFromMarkdown(content);
            const workflows = this.parseWorkflowsFromMarkdown(content);

            allRules.push(...rules);
            allConventions.push(...conventions);
            allWorkflows.push(...workflows);
            sourceFiles.push(filePath);
          }
        }
      }
    }

    return {
      extractedRules: this.deduplicateRules(allRules),
      extractedConventions: this.deduplicateRules(allConventions),
      extractedWorkflows: this.deduplicateRules(allWorkflows),
      sourceFiles,
    };
  }

  parseRulesFromMarkdown(content: string): string[] {
    const rules: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      // Match bullet points (- or * at start)
      const bulletMatch = line.match(/^[\s]*[-*]\s+(.+)$/);
      if (bulletMatch) {
        rules.push(bulletMatch[1].trim());
        continue;
      }

      // Match numbered lists (1. or 2. etc at start)
      const numberedMatch = line.match(/^[\s]*\d+\.\s+(.+)$/);
      if (numberedMatch) {
        rules.push(numberedMatch[1].trim());
      }
    }

    return rules;
  }

  parseConventionsFromMarkdown(content: string): string[] {
    const conventions: string[] = [];
    const lines = content.split('\n');
    let inConventionSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if we're entering a convention section
      if (line.match(/^#{1,6}\s+.*[Cc]onvention/)) {
        inConventionSection = true;
        continue;
      }

      // Check if we're leaving the convention section (new header)
      if (inConventionSection && line.match(/^#{1,6}\s+(?!.*[Cc]onvention)/)) {
        inConventionSection = false;
        continue;
      }

      // Extract items from convention sections
      if (inConventionSection) {
        const bulletMatch = line.match(/^[\s]*[-*]\s+(.+)$/);
        if (bulletMatch) {
          conventions.push(bulletMatch[1].trim());
          continue;
        }

        const numberedMatch = line.match(/^[\s]*\d+\.\s+(.+)$/);
        if (numberedMatch) {
          conventions.push(numberedMatch[1].trim());
        }
      }
    }

    return conventions;
  }

  parseWorkflowsFromMarkdown(content: string): string[] {
    const workflows: string[] = [];
    const lines = content.split('\n');
    let currentWorkflow: { title: string; steps: number } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for header (potential workflow title)
      const headerMatch = line.match(/^#{1,6}\s+(.+)$/);
      if (headerMatch) {
        // If we had a previous workflow with 3+ steps, save it
        if (currentWorkflow && currentWorkflow.steps >= 3) {
          workflows.push(
            `${currentWorkflow.title}: ${currentWorkflow.steps} steps`,
          );
        }
        // Start tracking new potential workflow
        currentWorkflow = { title: headerMatch[1].trim(), steps: 0 };
        continue;
      }

      // Count numbered steps in current section
      if (currentWorkflow && line.match(/^[\s]*\d+\.\s+(.+)$/)) {
        currentWorkflow.steps++;
      }
    }

    // Check final workflow
    if (currentWorkflow && currentWorkflow.steps >= 3) {
      workflows.push(
        `${currentWorkflow.title}: ${currentWorkflow.steps} steps`,
      );
    }

    return workflows;
  }

  deduplicateRules(rules: string[]): string[] {
    return Array.from(new Set(rules));
  }
}
