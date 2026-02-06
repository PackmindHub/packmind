import { DefaultSkillsDeployer } from './DefaultSkillsDeployer';

describe('DefaultSkillsDeployer', () => {
  let deployer: DefaultSkillsDeployer;

  beforeEach(() => {
    deployer = new DefaultSkillsDeployer('TestAgent', '.test/skills/');
  });

  describe('deployDefaultSkills', () => {
    describe('with default options', () => {
      let paths: string[];

      beforeEach(() => {
        const result = deployer.deployDefaultSkills();
        paths = result.createOrUpdate.map((f) => f.path);
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
    });

    describe('with includeBeta set to true', () => {
      let paths: string[];

      beforeEach(() => {
        const result = deployer.deployDefaultSkills({ includeBeta: true });
        paths = result.createOrUpdate.map((f) => f.path);
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
    });

    describe('with cliVersion specified', () => {
      describe('when cliVersion equals minimumVersion (0.14.0)', () => {
        let paths: string[];

        beforeEach(() => {
          const result = deployer.deployDefaultSkills({ cliVersion: '0.14.0' });
          paths = result.createOrUpdate.map((f) => f.path);
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
      });

      describe('when cliVersion is lower than minimumVersion (0.13.0)', () => {
        let paths: string[];

        beforeEach(() => {
          const result = deployer.deployDefaultSkills({ cliVersion: '0.13.0' });
          paths = result.createOrUpdate.map((f) => f.path);
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
          paths = result.createOrUpdate.map((f) => f.path);
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
          paths = result.createOrUpdate.map((f) => f.path);
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
      });
    });
  });
});
