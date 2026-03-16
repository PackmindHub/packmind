import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'yaml';
import {
  IPlaybookLocalRepository,
  PlaybookChangeEntry,
  PlaybookYaml,
} from '../../domain/repositories/IPlaybookLocalRepository';
import { logWarningConsole } from '../utils/consoleLogger';

export class PlaybookLocalRepository implements IPlaybookLocalRepository {
  private readonly storagePath: string;

  constructor(repoRoot: string) {
    const normalized = this.normalizeRepoRoot(repoRoot);
    const hash = crypto.createHash('md5').update(normalized).digest('hex');
    this.storagePath = path.join(
      os.homedir(),
      '.packmind',
      hash,
      'playbook.yaml',
    );
  }

  addChange(entry: PlaybookChangeEntry): void {
    const data = this.readYaml();
    const existingIndex = data.changes.findIndex(
      (c) => c.filePath === entry.filePath,
    );

    if (existingIndex >= 0) {
      data.changes[existingIndex] = entry;
    } else {
      data.changes.push(entry);
    }

    this.writeYaml(data);
  }

  removeChange(filePath: string): boolean {
    const data = this.readYaml();
    const initialLength = data.changes.length;
    data.changes = data.changes.filter((c) => c.filePath !== filePath);

    if (data.changes.length === initialLength) {
      return false;
    }

    this.writeYaml(data);
    return true;
  }

  getChanges(): PlaybookChangeEntry[] {
    return this.readYaml().changes;
  }

  getChange(filePath: string): PlaybookChangeEntry | null {
    return this.readYaml().changes.find((c) => c.filePath === filePath) ?? null;
  }

  private normalizeRepoRoot(repoRoot: string): string {
    let normalized = repoRoot.replace(/\\/g, '/');
    normalized = normalized.replace(/\/$/, '');
    return normalized;
  }

  private readYaml(): PlaybookYaml {
    if (!fs.existsSync(this.storagePath)) {
      return { version: 1, changes: [] };
    }

    try {
      const content = fs.readFileSync(this.storagePath, 'utf-8');
      const parsed = yaml.parse(content);

      if (!parsed || !Array.isArray(parsed.changes)) {
        return { version: 1, changes: [] };
      }

      return { version: 1, changes: parsed.changes };
    } catch {
      logWarningConsole(
        `Corrupted playbook file: ${this.storagePath}. Treating as empty.`,
      );
      return { version: 1, changes: [] };
    }
  }

  private writeYaml(data: PlaybookYaml): void {
    const dir = path.dirname(this.storagePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.storagePath, yaml.stringify(data), 'utf-8');
  }
}
