export interface PlaybookChangeEntry {
  filePath: string;
  artifactType: 'standard' | 'command' | 'skill';
  artifactName: string;
  codingAgent: string;
  changeType?: 'created' | 'updated';
  addedAt: string; // ISO 8601
  spaceId: string;
  targetId?: string;
  content: string; // full content snapshot (for skills: serialized payload)
}

export interface PlaybookYaml {
  version: 1;
  changes: PlaybookChangeEntry[];
}

export interface IPlaybookLocalRepository {
  addChange(entry: PlaybookChangeEntry): void;
  removeChange(filePath: string): boolean;
  getChanges(): PlaybookChangeEntry[];
  getChange(filePath: string): PlaybookChangeEntry | null;
  clearAll(): void;
}
