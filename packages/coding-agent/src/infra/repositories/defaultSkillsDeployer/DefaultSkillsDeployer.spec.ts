import { DefaultSkillsDeployer } from './DefaultSkillsDeployer';

describe('DefaultSkillsDeployer', () => {
  let deployer: DefaultSkillsDeployer;

  beforeEach(() => {
    deployer = new DefaultSkillsDeployer('TestAgent', '.test/skills/');
  });

  describe('deployDefaultSkills', () => {
    describe('with default options', () => {
      let result: ReturnType<DefaultSkillsDeployer['deployDefaultSkills']>;
      let paths: string[];

      beforeEach(() => {
        result = deployer.deployDefaultSkills();
        paths = result.fileUpdates.createOrUpdate.map((f) => f.path);
      });

      it('includes packmind-create-skill', () => {
        expect(paths.some((p) => p.includes('packmind-create-skill'))).toBe(
          true,
        );
      });

      it('includes packmind-create-standard', () => {
        expect(paths.some((p) => p.includes('packmind-create-standard'))).toBe(
          true,
        );
      });

      it('includes packmind-onboard', () => {
        expect(paths.some((p) => p.includes('packmind-onboard'))).toBe(true);
      });

      it('includes packmind-create-command', () => {
        expect(paths.some((p) => p.includes('packmind-create-command'))).toBe(
          true,
        );
      });

      it('includes packmind-create-package', () => {
        expect(paths.some((p) => p.includes('packmind-create-package'))).toBe(
          true,
        );
      });

      it('includes packmind-cli-list-commands', () => {
        expect(
          paths.some((p) => p.includes('packmind-cli-list-commands')),
        ).toBe(true);
      });

      it('includes packmind-update-playbook', () => {
        expect(paths.some((p) => p.includes('packmind-update-playbook'))).toBe(
          true,
        );
      });

      it('excludes packmind-update-playbook-v2 (unreleased)', () => {
        expect(
          paths.some((p) => p.includes('packmind-update-playbook-v2')),
        ).toBe(false);
      });

      it('returns 0 skipped skills', () => {
        expect(deployer.deployDefaultSkills().skippedSkillsCount).toBe(0);
      });
    });

    describe('with includeBeta set to true', () => {
      let result: ReturnType<DefaultSkillsDeployer['deployDefaultSkills']>;
      let paths: string[];

      beforeEach(() => {
        result = deployer.deployDefaultSkills({ includeBeta: true });
        paths = result.fileUpdates.createOrUpdate.map((f) => f.path);
      });

      it('includes packmind-create-skill', () => {
        expect(paths.some((p) => p.includes('packmind-create-skill'))).toBe(
          true,
        );
      });

      it('includes packmind-create-standard', () => {
        expect(paths.some((p) => p.includes('packmind-create-standard'))).toBe(
          true,
        );
      });

      it('includes packmind-onboard', () => {
        expect(paths.some((p) => p.includes('packmind-onboard'))).toBe(true);
      });

      it('includes packmind-create-command', () => {
        expect(paths.some((p) => p.includes('packmind-create-command'))).toBe(
          true,
        );
      });

      it('includes packmind-versions/next/apply-changes.md for update-playbook', () => {
        expect(
          paths.some(
            (p) =>
              p.includes('packmind-update-playbook') &&
              p.includes('packmind-versions/next/apply-changes.md'),
          ),
        ).toBe(true);
      });

      it('does not delete packmind-versions/next directory for update-playbook', () => {
        const deletePaths = result.fileUpdates.delete.map((d) => d.path);
        expect(
          deletePaths.some(
            (p) =>
              p.includes('packmind-update-playbook') &&
              p.includes('packmind-versions/next'),
          ),
        ).toBe(false);
      });

      it('returns 0 skipped skills', () => {
        expect(
          deployer.deployDefaultSkills({ includeBeta: true })
            .skippedSkillsCount,
        ).toBe(0);
      });
    });

    describe('with cliVersion specified', () => {
      describe('when cliVersion equals minimumVersion (0.14.0)', () => {
        let paths: string[];

        beforeEach(() => {
          const result = deployer.deployDefaultSkills({ cliVersion: '0.14.0' });
          paths = result.fileUpdates.createOrUpdate.map((f) => f.path);
        });

        it('includes packmind-create-skill', () => {
          expect(paths.some((p) => p.includes('packmind-create-skill'))).toBe(
            true,
          );
        });

        it('includes packmind-create-standard', () => {
          expect(
            paths.some((p) => p.includes('packmind-create-standard')),
          ).toBe(true);
        });

        it('excludes packmind-onboard (requires 0.16.0)', () => {
          expect(paths.some((p) => p.includes('packmind-onboard'))).toBe(false);
        });

        it('excludes packmind-create-command (requires 0.15.0)', () => {
          expect(paths.some((p) => p.includes('packmind-create-command'))).toBe(
            false,
          );
        });

        it('excludes packmind-update-playbook (requires 0.21.0)', () => {
          expect(
            paths.some((p) => p.includes('packmind-update-playbook')),
          ).toBe(false);
        });

        it('returns skipped count for skills requiring a higher version', () => {
          expect(
            deployer.deployDefaultSkills({ cliVersion: '0.14.0' })
              .skippedSkillsCount,
          ).toBeGreaterThan(0);
        });
      });

      describe('when cliVersion is lower than minimumVersion (0.13.0)', () => {
        let paths: string[];

        beforeEach(() => {
          const result = deployer.deployDefaultSkills({ cliVersion: '0.13.0' });
          paths = result.fileUpdates.createOrUpdate.map((f) => f.path);
        });

        it('excludes packmind-create-skill', () => {
          expect(paths.some((p) => p.includes('packmind-create-skill'))).toBe(
            false,
          );
        });

        it('excludes packmind-create-standard', () => {
          expect(
            paths.some((p) => p.includes('packmind-create-standard')),
          ).toBe(false);
        });

        it('excludes packmind-onboard', () => {
          expect(paths.some((p) => p.includes('packmind-onboard'))).toBe(false);
        });

        it('excludes packmind-create-command', () => {
          expect(paths.some((p) => p.includes('packmind-create-command'))).toBe(
            false,
          );
        });
      });

      describe('when cliVersion is higher than minimumVersion (1.0.0)', () => {
        let paths: string[];

        beforeEach(() => {
          const result = deployer.deployDefaultSkills({ cliVersion: '1.0.0' });
          paths = result.fileUpdates.createOrUpdate.map((f) => f.path);
        });

        it('includes packmind-create-skill', () => {
          expect(paths.some((p) => p.includes('packmind-create-skill'))).toBe(
            true,
          );
        });

        it('includes packmind-create-standard', () => {
          expect(
            paths.some((p) => p.includes('packmind-create-standard')),
          ).toBe(true);
        });

        it('includes packmind-onboard', () => {
          expect(paths.some((p) => p.includes('packmind-onboard'))).toBe(true);
        });

        it('includes packmind-create-command', () => {
          expect(paths.some((p) => p.includes('packmind-create-command'))).toBe(
            true,
          );
        });

        it('includes packmind-create-package', () => {
          expect(paths.some((p) => p.includes('packmind-create-package'))).toBe(
            true,
          );
        });

        it('includes packmind-cli-list-commands', () => {
          expect(
            paths.some((p) => p.includes('packmind-cli-list-commands')),
          ).toBe(true);
        });

        it('includes packmind-update-playbook', () => {
          expect(
            paths.some((p) => p.includes('packmind-update-playbook')),
          ).toBe(true);
        });

        it('returns 0 skipped skills', () => {
          expect(
            deployer.deployDefaultSkills({ cliVersion: '1.0.0' })
              .skippedSkillsCount,
          ).toBe(0);
        });
      });
    });

    describe('with includeBeta and cliVersion', () => {
      describe('when includeBeta is true', () => {
        let paths: string[];

        beforeEach(() => {
          const result = deployer.deployDefaultSkills({
            cliVersion: '0.1.0',
            includeBeta: true,
          });
          paths = result.fileUpdates.createOrUpdate.map((f) => f.path);
        });

        it('includes packmind-create-skill regardless of cliVersion', () => {
          expect(paths.some((p) => p.includes('packmind-create-skill'))).toBe(
            true,
          );
        });

        it('includes packmind-create-standard regardless of cliVersion', () => {
          expect(
            paths.some((p) => p.includes('packmind-create-standard')),
          ).toBe(true);
        });

        it('includes packmind-onboard regardless of cliVersion', () => {
          expect(paths.some((p) => p.includes('packmind-onboard'))).toBe(true);
        });

        it('includes packmind-create-command regardless of cliVersion', () => {
          expect(paths.some((p) => p.includes('packmind-create-command'))).toBe(
            true,
          );
        });

        it('returns 0 skipped skills', () => {
          expect(
            deployer.deployDefaultSkills({
              cliVersion: '0.1.0',
              includeBeta: true,
            }).skippedSkillsCount,
          ).toBe(0);
        });
      });
    });

    describe('skippedSkillsCount', () => {
      describe('when cliVersion is provided and some skills require a higher version', () => {
        it('counts only released skills with minimumVersion higher than cliVersion', () => {
          const result = deployer.deployDefaultSkills({ cliVersion: '0.14.0' });
          expect(result.skippedSkillsCount).toBeGreaterThan(0);
        });
      });

      describe('when cliVersion is high enough for all released skills', () => {
        it('returns 0 skipped skills', () => {
          const result = deployer.deployDefaultSkills({ cliVersion: '1.0.0' });
          expect(result.skippedSkillsCount).toBe(0);
        });
      });

      describe('when no cliVersion is provided', () => {
        it('returns 0 skipped skills', () => {
          expect(deployer.deployDefaultSkills().skippedSkillsCount).toBe(0);
        });
      });
    });
  });
});
