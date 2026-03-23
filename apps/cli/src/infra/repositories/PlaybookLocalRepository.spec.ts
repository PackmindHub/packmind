import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as yaml from 'yaml';
import { PlaybookLocalRepository } from './PlaybookLocalRepository';
import {
  PlaybookChangeEntry,
  PlaybookYaml,
} from '../../domain/repositories/IPlaybookLocalRepository';
import * as consoleLogger from '../utils/consoleLogger';

jest.mock('fs');
jest.mock('os');
jest.mock('../utils/consoleLogger');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockOs = os as jest.Mocked<typeof os>;

describe('PlaybookLocalRepository', () => {
  let repository: PlaybookLocalRepository;

  beforeEach(() => {
    mockOs.homedir.mockReturnValue('/home/user');
    repository = new PlaybookLocalRepository('/my/project');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('storage path computation', () => {
    it('computes path using md5 of normalized repo root', () => {
      // md5 of '/my/project' (no trailing slash, forward slashes)
      const expectedHash = crypto
        .createHash('md5')
        .update('/my/project')
        .digest('hex');

      const expectedPath = `/home/user/.packmind/${expectedHash}/playbook.yaml`;

      // Trigger a read to verify the path
      mockFs.existsSync.mockReturnValue(false);
      repository.getChanges();

      expect(mockFs.existsSync).toHaveBeenCalledWith(expectedPath);
    });

    describe('when repo root has trailing slash', () => {
      it('produces the same path as without trailing slash', () => {
        const repoWithSlash = new PlaybookLocalRepository('/my/project/');

        const expectedHash = crypto
          .createHash('md5')
          .update('/my/project')
          .digest('hex');
        const expectedPath = `/home/user/.packmind/${expectedHash}/playbook.yaml`;

        mockFs.existsSync.mockReturnValue(false);
        repoWithSlash.getChanges();
        expect(mockFs.existsSync).toHaveBeenCalledWith(expectedPath);
      });
    });

    it('normalizes backslashes to forward slashes', () => {
      const repoWithBackslashes = new PlaybookLocalRepository(
        'C:\\Users\\dev\\project',
      );

      const expectedHash = crypto
        .createHash('md5')
        .update('C:/Users/dev/project')
        .digest('hex');
      const expectedPath = `/home/user/.packmind/${expectedHash}/playbook.yaml`;

      mockFs.existsSync.mockReturnValue(false);
      repoWithBackslashes.getChanges();
      expect(mockFs.existsSync).toHaveBeenCalledWith(expectedPath);
    });
  });

  describe('getChanges', () => {
    describe('when playbook file does not exist', () => {
      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(false);
      });

      it('returns an empty array', () => {
        expect(repository.getChanges()).toEqual([]);
      });
    });

    describe('when playbook file exists with valid content', () => {
      const entries: PlaybookChangeEntry[] = [
        {
          filePath: '.packmind/standards/my-standard.md',
          artifactType: 'standard',
          artifactName: 'My Standard',
          codingAgent: 'claude',
          addedAt: '2026-03-16T10:00:00.000Z',
          spaceId: 'space-1',
          content: '# My Standard\nContent here',
        },
      ];

      const yamlContent: PlaybookYaml = { version: 1, changes: entries };

      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(yaml.stringify(yamlContent));
      });

      it('returns the parsed changes', () => {
        expect(repository.getChanges()).toEqual(entries);
      });
    });

    describe('when playbook file contains corrupted YAML', () => {
      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(': invalid: yaml: [[[');
      });

      it('returns an empty array', () => {
        expect(repository.getChanges()).toEqual([]);
      });

      it('logs a warning', () => {
        repository.getChanges();
        expect(consoleLogger.logWarningConsole).toHaveBeenCalled();
      });
    });

    describe('when playbook file has missing changes array', () => {
      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(yaml.stringify({ version: 1 }));
      });

      it('returns an empty array', () => {
        expect(repository.getChanges()).toEqual([]);
      });
    });
  });

  describe('getChange', () => {
    const entry: PlaybookChangeEntry = {
      filePath: '.packmind/standards/my-standard.md',
      artifactType: 'standard',
      artifactName: 'My Standard',
      codingAgent: 'claude',
      addedAt: '2026-03-16T10:00:00.000Z',
      spaceId: 'space-1',
      content: '# Content',
    };

    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        yaml.stringify({ version: 1, changes: [entry] }),
      );
    });

    describe('when entry exists', () => {
      it('returns the entry', () => {
        expect(
          repository.getChange('.packmind/standards/my-standard.md', 'space-1'),
        ).toEqual(entry);
      });
    });

    describe('when entry does not exist', () => {
      it('returns null for different filePath', () => {
        expect(
          repository.getChange('.packmind/standards/other.md', 'space-1'),
        ).toBeNull();
      });

      it('returns null for different spaceId', () => {
        expect(
          repository.getChange('.packmind/standards/my-standard.md', 'space-2'),
        ).toBeNull();
      });
    });
  });

  describe('addChange', () => {
    const entry: PlaybookChangeEntry = {
      filePath: '.packmind/standards/my-standard.md',
      artifactType: 'standard',
      artifactName: 'My Standard',
      codingAgent: 'claude',
      addedAt: '2026-03-16T10:00:00.000Z',
      spaceId: 'space-1',
      content: '# Content',
    };

    describe('when playbook file does not exist', () => {
      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(false);
        mockFs.mkdirSync.mockReturnValue(undefined);
        mockFs.writeFileSync.mockReturnValue(undefined);

        repository.addChange(entry);
      });

      it('creates the directory', () => {
        expect(mockFs.mkdirSync).toHaveBeenCalledWith(expect.any(String), {
          recursive: true,
        });
      });

      it('writes the YAML file with the entry', () => {
        const writtenContent = mockFs.writeFileSync.mock.calls[0][1] as string;
        const parsed = yaml.parse(writtenContent) as PlaybookYaml;

        expect(parsed.changes).toEqual([entry]);
      });
    });

    describe('when playbook file exists with entries', () => {
      const existingEntry: PlaybookChangeEntry = {
        filePath: '.packmind/commands/my-command.md',
        artifactType: 'command',
        artifactName: 'My Command',
        codingAgent: 'packmind',
        addedAt: '2026-03-15T10:00:00.000Z',
        spaceId: 'space-1',
        content: '# Command',
      };

      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(
          yaml.stringify({ version: 1, changes: [existingEntry] }),
        );
        mockFs.mkdirSync.mockReturnValue(undefined);
        mockFs.writeFileSync.mockReturnValue(undefined);

        repository.addChange(entry);
      });

      it('appends the new entry after existing ones', () => {
        const writtenContent = mockFs.writeFileSync.mock.calls[0][1] as string;
        const parsed = yaml.parse(writtenContent) as PlaybookYaml;

        expect(parsed.changes).toEqual([existingEntry, entry]);
      });
    });

    describe('when adding an entry with same filePath and spaceId (upsert)', () => {
      const existingEntry: PlaybookChangeEntry = {
        filePath: '.packmind/standards/my-standard.md',
        artifactType: 'standard',
        artifactName: 'Old Name',
        codingAgent: 'claude',
        addedAt: '2026-03-15T10:00:00.000Z',
        spaceId: 'space-1',
        content: '# Old',
      };

      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(
          yaml.stringify({ version: 1, changes: [existingEntry] }),
        );
        mockFs.mkdirSync.mockReturnValue(undefined);
        mockFs.writeFileSync.mockReturnValue(undefined);

        repository.addChange(entry);
      });

      it('replaces the existing entry', () => {
        const writtenContent = mockFs.writeFileSync.mock.calls[0][1] as string;
        const parsed = yaml.parse(writtenContent) as PlaybookYaml;

        expect(parsed.changes).toEqual([entry]);
      });
    });

    describe('when adding an entry with same filePath but different spaceId', () => {
      const existingEntry: PlaybookChangeEntry = {
        filePath: '.packmind/standards/my-standard.md',
        artifactType: 'standard',
        artifactName: 'My Standard',
        codingAgent: 'claude',
        addedAt: '2026-03-15T10:00:00.000Z',
        spaceId: 'space-1',
        content: '# Content',
      };

      const entryForOtherSpace: PlaybookChangeEntry = {
        ...entry,
        spaceId: 'space-2',
        spaceName: 'Other Space',
      };

      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(
          yaml.stringify({ version: 1, changes: [existingEntry] }),
        );
        mockFs.mkdirSync.mockReturnValue(undefined);
        mockFs.writeFileSync.mockReturnValue(undefined);

        repository.addChange(entryForOtherSpace);
      });

      it('keeps both entries', () => {
        const writtenContent = mockFs.writeFileSync.mock.calls[0][1] as string;
        const parsed = yaml.parse(writtenContent) as PlaybookYaml;

        expect(parsed.changes).toHaveLength(2);
      });

      it('preserves the original space entry first', () => {
        const writtenContent = mockFs.writeFileSync.mock.calls[0][1] as string;
        const parsed = yaml.parse(writtenContent) as PlaybookYaml;

        expect(parsed.changes[0].spaceId).toBe('space-1');
      });

      it('appends the new space entry second', () => {
        const writtenContent = mockFs.writeFileSync.mock.calls[0][1] as string;
        const parsed = yaml.parse(writtenContent) as PlaybookYaml;

        expect(parsed.changes[1].spaceId).toBe('space-2');
      });
    });
  });

  describe('removeChange', () => {
    const entry: PlaybookChangeEntry = {
      filePath: '.packmind/standards/my-standard.md',
      artifactType: 'standard',
      artifactName: 'My Standard',
      codingAgent: 'claude',
      addedAt: '2026-03-16T10:00:00.000Z',
      spaceId: 'space-1',
      content: '# Content',
    };

    describe('when entry exists', () => {
      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(
          yaml.stringify({ version: 1, changes: [entry] }),
        );
        mockFs.mkdirSync.mockReturnValue(undefined);
        mockFs.writeFileSync.mockReturnValue(undefined);
      });

      it('returns true', () => {
        expect(
          repository.removeChange(
            '.packmind/standards/my-standard.md',
            'space-1',
          ),
        ).toBe(true);
      });

      it('writes the file without the removed entry', () => {
        repository.removeChange(
          '.packmind/standards/my-standard.md',
          'space-1',
        );

        const writtenContent = mockFs.writeFileSync.mock.calls[0][1] as string;
        const parsed = yaml.parse(writtenContent) as PlaybookYaml;

        expect(parsed.changes).toHaveLength(0);
      });
    });

    describe('when entry does not exist', () => {
      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(
          yaml.stringify({ version: 1, changes: [entry] }),
        );
      });

      it('returns false for different filePath', () => {
        expect(
          repository.removeChange('.packmind/standards/other.md', 'space-1'),
        ).toBe(false);
      });

      it('returns false for different spaceId', () => {
        expect(
          repository.removeChange(
            '.packmind/standards/my-standard.md',
            'space-2',
          ),
        ).toBe(false);
      });
    });

    describe('when removing one of multiple spaces for same filePath', () => {
      const entrySpace2: PlaybookChangeEntry = {
        ...entry,
        spaceId: 'space-2',
      };

      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(
          yaml.stringify({ version: 1, changes: [entry, entrySpace2] }),
        );
        mockFs.mkdirSync.mockReturnValue(undefined);
        mockFs.writeFileSync.mockReturnValue(undefined);
      });

      it('only removes the entry for the specified space', () => {
        repository.removeChange(
          '.packmind/standards/my-standard.md',
          'space-1',
        );

        const writtenContent = mockFs.writeFileSync.mock.calls[0][1] as string;
        const parsed = yaml.parse(writtenContent) as PlaybookYaml;

        expect(parsed.changes).toHaveLength(1);
        expect(parsed.changes[0].spaceId).toBe('space-2');
      });
    });

    describe('when playbook file does not exist', () => {
      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(false);
      });

      it('returns false', () => {
        expect(
          repository.removeChange(
            '.packmind/standards/my-standard.md',
            'space-1',
          ),
        ).toBe(false);
      });
    });
  });

  describe('clearAll', () => {
    describe('when playbook file exists with entries', () => {
      const entries: PlaybookChangeEntry[] = [
        {
          filePath: '.packmind/standards/std-1.md',
          artifactType: 'standard',
          artifactName: 'Standard 1',
          codingAgent: 'claude',
          addedAt: '2026-03-16T10:00:00.000Z',
          spaceId: 'space-1',
          content: '# Standard 1',
          changeType: 'created',
        },
        {
          filePath: '.packmind/commands/cmd-1.md',
          artifactType: 'command',
          artifactName: 'Command 1',
          codingAgent: 'claude',
          addedAt: '2026-03-16T11:00:00.000Z',
          spaceId: 'space-1',
          content: '# Command 1',
          changeType: 'updated',
        },
      ];

      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(
          yaml.stringify({ version: 1, changes: entries }),
        );
        mockFs.mkdirSync.mockReturnValue(undefined);
        mockFs.writeFileSync.mockReturnValue(undefined);

        repository.clearAll();
      });

      it('writes a YAML file with empty changes array', () => {
        const writtenContent = mockFs.writeFileSync.mock.calls[0][1] as string;
        const parsed = yaml.parse(writtenContent) as PlaybookYaml;

        expect(parsed.changes).toEqual([]);
      });
    });

    describe('when playbook file does not exist', () => {
      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(false);
        mockFs.mkdirSync.mockReturnValue(undefined);
        mockFs.writeFileSync.mockReturnValue(undefined);

        repository.clearAll();
      });

      it('writes a YAML file with empty changes array', () => {
        const writtenContent = mockFs.writeFileSync.mock.calls[0][1] as string;
        const parsed = yaml.parse(writtenContent) as PlaybookYaml;

        expect(parsed.changes).toEqual([]);
      });
    });
  });

  describe('changeType field persistence', () => {
    const entryWithChangeType: PlaybookChangeEntry = {
      filePath: '.packmind/standards/my-standard.md',
      artifactType: 'standard',
      artifactName: 'My Standard',
      codingAgent: 'claude',
      addedAt: '2026-03-16T10:00:00.000Z',
      spaceId: 'space-1',
      content: '# Content',
      changeType: 'created',
    };

    describe('when adding an entry with changeType', () => {
      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(false);
        mockFs.mkdirSync.mockReturnValue(undefined);
        mockFs.writeFileSync.mockReturnValue(undefined);

        repository.addChange(entryWithChangeType);
      });

      it('persists the changeType field', () => {
        const writtenContent = mockFs.writeFileSync.mock.calls[0][1] as string;
        const parsed = yaml.parse(writtenContent) as PlaybookYaml;

        expect(parsed.changes[0].changeType).toBe('created');
      });
    });

    describe('when reading an entry with changeType', () => {
      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(
          yaml.stringify({ version: 1, changes: [entryWithChangeType] }),
        );
      });

      it('returns the changeType field', () => {
        const changes = repository.getChanges();

        expect(changes[0].changeType).toBe('created');
      });
    });
  });
});
