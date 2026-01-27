import { SkillsScannerService } from './SkillsScannerService';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('SkillsScannerService', () => {
  let service: SkillsScannerService;
  let tempDir: string;

  beforeEach(async () => {
    service = new SkillsScannerService();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-scanner-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('scanExistingSkills', () => {
    it('discovers skills in .claude/skills directory', async () => {
      const skillDir = path.join(tempDir, '.claude/skills/my-custom-skill');
      await fs.mkdir(skillDir, { recursive: true });
      await fs.writeFile(
        path.join(skillDir, 'SKILL.md'),
        `---
name: my-custom-skill
description: A custom debugging skill
---

# My Custom Skill

This skill helps with debugging.`,
      );

      const result = await service.scanExistingSkills(tempDir);

      expect(result.skills).toHaveLength(1);
      expect(result.skills[0].name).toBe('my-custom-skill');
      expect(result.skills[0].description).toBe('A custom debugging skill');
    });

    it('discovers skills in .github/skills directory', async () => {
      const skillDir = path.join(tempDir, '.github/skills/github-skill');
      await fs.mkdir(skillDir, { recursive: true });
      await fs.writeFile(
        path.join(skillDir, 'SKILL.md'),
        `# GitHub Skill

This is a skill for GitHub workflows.`,
      );

      const result = await service.scanExistingSkills(tempDir);

      expect(result.skills).toHaveLength(1);
      expect(result.skills[0].name).toBe('github-skill');
      expect(result.skills[0].description).toBe(
        'This is a skill for GitHub workflows.',
      );
    });

    it('skips Packmind-provided skills by name', async () => {
      const skillDir = path.join(
        tempDir,
        '.claude/skills/packmind-create-standard',
      );
      await fs.mkdir(skillDir, { recursive: true });
      await fs.writeFile(
        path.join(skillDir, 'SKILL.md'),
        `# Packmind Create Standard

This skill creates standards.`,
      );

      const result = await service.scanExistingSkills(tempDir);

      expect(result.skills).toHaveLength(0);
      expect(result.skippedPackmindSkills).toContain(
        'packmind-create-standard',
      );
    });

    it('skips skills that reference packmind packages', async () => {
      const skillDir = path.join(tempDir, '.claude/skills/some-skill');
      await fs.mkdir(skillDir, { recursive: true });
      await fs.writeFile(
        path.join(skillDir, 'SKILL.md'),
        `# Some Skill

This skill is from Packmind package.

Use packmind pull to update.`,
      );

      const result = await service.scanExistingSkills(tempDir);

      expect(result.skills).toHaveLength(0);
      expect(result.skippedPackmindSkills).toContain('some-skill');
    });

    it('returns empty result when no skill directories exist', async () => {
      const result = await service.scanExistingSkills(tempDir);

      expect(result.skills).toHaveLength(0);
      expect(result.skippedPackmindSkills).toHaveLength(0);
    });

    it('skips directories without SKILL.md', async () => {
      const skillDir = path.join(tempDir, '.claude/skills/incomplete-skill');
      await fs.mkdir(skillDir, { recursive: true });
      await fs.writeFile(path.join(skillDir, 'README.md'), '# Incomplete');

      const result = await service.scanExistingSkills(tempDir);

      expect(result.skills).toHaveLength(0);
    });

    it('extracts description from first paragraph when no frontmatter', async () => {
      const skillDir = path.join(tempDir, '.claude/skills/simple-skill');
      await fs.mkdir(skillDir, { recursive: true });
      await fs.writeFile(
        path.join(skillDir, 'SKILL.md'),
        `# Simple Skill

This skill does something specific and useful.

## Usage

How to use it.`,
      );

      const result = await service.scanExistingSkills(tempDir);

      expect(result.skills[0].description).toBe(
        'This skill does something specific and useful.',
      );
    });

    it('includes full prompt content', async () => {
      const skillContent = `---
name: full-skill
description: Full skill
---

# Full Skill

Complete content here.

## Steps

1. Do this
2. Do that`;

      const skillDir = path.join(tempDir, '.claude/skills/full-skill');
      await fs.mkdir(skillDir, { recursive: true });
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillContent);

      const result = await service.scanExistingSkills(tempDir);

      expect(result.skills[0].prompt).toBe(skillContent);
    });

    it('discovers skills from both directories', async () => {
      const claudeSkillDir = path.join(tempDir, '.claude/skills/skill-a');
      const githubSkillDir = path.join(tempDir, '.github/skills/skill-b');

      await fs.mkdir(claudeSkillDir, { recursive: true });
      await fs.mkdir(githubSkillDir, { recursive: true });

      await fs.writeFile(
        path.join(claudeSkillDir, 'SKILL.md'),
        '# Skill A\n\nDescription A',
      );
      await fs.writeFile(
        path.join(githubSkillDir, 'SKILL.md'),
        '# Skill B\n\nDescription B',
      );

      const result = await service.scanExistingSkills(tempDir);

      expect(result.skills).toHaveLength(2);
      const names = result.skills.map((s) => s.name);
      expect(names).toContain('skill-a');
      expect(names).toContain('skill-b');
    });
  });
});
