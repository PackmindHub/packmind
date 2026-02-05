import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import {
  AgentArtifactDetectionService,
  DetectedAgentArtifact,
} from './AgentArtifactDetectionService';

describe('AgentArtifactDetectionService', () => {
  let tempDir: string;
  let service: AgentArtifactDetectionService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-artifact-test-'));
    service = new AgentArtifactDetectionService();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('detectAgentArtifacts', () => {
    describe('when no artifacts exist', () => {
      it('returns empty array', async () => {
        const result = await service.detectAgentArtifacts(tempDir);

        expect(result).toEqual([]);
      });
    });

    describe('when .claude/ directory exists', () => {
      let result: DetectedAgentArtifact[];

      beforeEach(async () => {
        await fs.mkdir(path.join(tempDir, '.claude'));
        result = await service.detectAgentArtifacts(tempDir);
      });

      it('returns claude agent', () => {
        expect(result).toContainEqual({
          agent: 'claude',
          artifactPath: path.join(tempDir, '.claude'),
        });
      });
    });

    describe('when .cursor/ directory exists', () => {
      let result: DetectedAgentArtifact[];

      beforeEach(async () => {
        await fs.mkdir(path.join(tempDir, '.cursor'));
        result = await service.detectAgentArtifacts(tempDir);
      });

      it('returns cursor agent', () => {
        expect(result).toContainEqual({
          agent: 'cursor',
          artifactPath: path.join(tempDir, '.cursor'),
        });
      });
    });

    describe('when .github/copilot-instructions.md exists', () => {
      let result: DetectedAgentArtifact[];

      beforeEach(async () => {
        await fs.mkdir(path.join(tempDir, '.github'), { recursive: true });
        await fs.writeFile(
          path.join(tempDir, '.github/copilot-instructions.md'),
          '',
        );
        result = await service.detectAgentArtifacts(tempDir);
      });

      it('returns copilot agent', () => {
        expect(result).toContainEqual({
          agent: 'copilot',
          artifactPath: path.join(tempDir, '.github/copilot-instructions.md'),
        });
      });
    });

    describe('when .github/instructions/ directory exists', () => {
      let result: DetectedAgentArtifact[];

      beforeEach(async () => {
        await fs.mkdir(path.join(tempDir, '.github/instructions'), {
          recursive: true,
        });
        result = await service.detectAgentArtifacts(tempDir);
      });

      it('returns copilot agent', () => {
        expect(result).toContainEqual({
          agent: 'copilot',
          artifactPath: path.join(tempDir, '.github/instructions'),
        });
      });
    });

    describe('when both copilot artifacts exist', () => {
      let result: DetectedAgentArtifact[];

      beforeEach(async () => {
        await fs.mkdir(path.join(tempDir, '.github/instructions'), {
          recursive: true,
        });
        await fs.writeFile(
          path.join(tempDir, '.github/copilot-instructions.md'),
          '',
        );
        result = await service.detectAgentArtifacts(tempDir);
      });

      it('returns copilot agent only once', () => {
        const copilotResults = result.filter((r) => r.agent === 'copilot');
        expect(copilotResults).toHaveLength(1);
      });

      it('uses the first matching path for copilot', () => {
        const copilotResult = result.find((r) => r.agent === 'copilot');
        expect(copilotResult?.artifactPath).toBe(
          path.join(tempDir, '.github/copilot-instructions.md'),
        );
      });
    });

    describe('when .continue/ directory exists', () => {
      let result: DetectedAgentArtifact[];

      beforeEach(async () => {
        await fs.mkdir(path.join(tempDir, '.continue'));
        result = await service.detectAgentArtifacts(tempDir);
      });

      it('returns continue agent', () => {
        expect(result).toContainEqual({
          agent: 'continue',
          artifactPath: path.join(tempDir, '.continue'),
        });
      });
    });

    describe('when .junie/ directory exists', () => {
      let result: DetectedAgentArtifact[];

      beforeEach(async () => {
        await fs.mkdir(path.join(tempDir, '.junie'));
        result = await service.detectAgentArtifacts(tempDir);
      });

      it('returns junie agent', () => {
        expect(result).toContainEqual({
          agent: 'junie',
          artifactPath: path.join(tempDir, '.junie'),
        });
      });
    });

    describe('when .junie.md file exists', () => {
      let result: DetectedAgentArtifact[];

      beforeEach(async () => {
        await fs.writeFile(path.join(tempDir, '.junie.md'), '');
        result = await service.detectAgentArtifacts(tempDir);
      });

      it('returns junie agent', () => {
        expect(result).toContainEqual({
          agent: 'junie',
          artifactPath: path.join(tempDir, '.junie.md'),
        });
      });
    });

    describe('when both junie artifacts exist', () => {
      let result: DetectedAgentArtifact[];

      beforeEach(async () => {
        await fs.mkdir(path.join(tempDir, '.junie'));
        await fs.writeFile(path.join(tempDir, '.junie.md'), '');
        result = await service.detectAgentArtifacts(tempDir);
      });

      it('returns junie agent only once', () => {
        const junieResults = result.filter((r) => r.agent === 'junie');
        expect(junieResults).toHaveLength(1);
      });

      it('uses the first matching path for junie', () => {
        const junieResult = result.find((r) => r.agent === 'junie');
        expect(junieResult?.artifactPath).toBe(path.join(tempDir, '.junie'));
      });
    });

    describe('when AGENTS.md file exists', () => {
      let result: DetectedAgentArtifact[];

      beforeEach(async () => {
        await fs.writeFile(path.join(tempDir, 'AGENTS.md'), '');
        result = await service.detectAgentArtifacts(tempDir);
      });

      it('returns agents_md agent', () => {
        expect(result).toContainEqual({
          agent: 'agents_md',
          artifactPath: path.join(tempDir, 'AGENTS.md'),
        });
      });
    });

    describe('when .gitlab/ directory exists', () => {
      let result: DetectedAgentArtifact[];

      beforeEach(async () => {
        await fs.mkdir(path.join(tempDir, '.gitlab'));
        result = await service.detectAgentArtifacts(tempDir);
      });

      it('returns gitlab_duo agent', () => {
        expect(result).toContainEqual({
          agent: 'gitlab_duo',
          artifactPath: path.join(tempDir, '.gitlab'),
        });
      });
    });

    describe('when multiple agent artifacts exist', () => {
      let result: DetectedAgentArtifact[];

      beforeEach(async () => {
        await fs.mkdir(path.join(tempDir, '.claude'));
        await fs.mkdir(path.join(tempDir, '.cursor'));
        await fs.mkdir(path.join(tempDir, '.continue'));
        result = await service.detectAgentArtifacts(tempDir);
      });

      it('returns all detected agents', () => {
        expect(result).toHaveLength(3);
      });

      it('includes claude agent', () => {
        expect(result).toContainEqual({
          agent: 'claude',
          artifactPath: path.join(tempDir, '.claude'),
        });
      });

      it('includes cursor agent', () => {
        expect(result).toContainEqual({
          agent: 'cursor',
          artifactPath: path.join(tempDir, '.cursor'),
        });
      });

      it('includes continue agent', () => {
        expect(result).toContainEqual({
          agent: 'continue',
          artifactPath: path.join(tempDir, '.continue'),
        });
      });
    });

    describe('when checking packmind detection', () => {
      let result: DetectedAgentArtifact[];

      beforeEach(async () => {
        await fs.mkdir(path.join(tempDir, '.packmind'));
        result = await service.detectAgentArtifacts(tempDir);
      });

      it('does not detect packmind agent', () => {
        const packmindResults = result.filter((r) => r.agent === 'packmind');
        expect(packmindResults).toHaveLength(0);
      });
    });
  });
});
