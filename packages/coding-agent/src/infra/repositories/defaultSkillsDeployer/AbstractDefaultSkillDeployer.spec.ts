import { AbstractDefaultSkillDeployer } from './AbstractDefaultSkillDeployer';
import { FileUpdates } from '@packmind/types';

describe('AbstractDefaultSkillDeployer', () => {
  describe('isSupportedByCliVersion', () => {
    describe('when the deployer is not released yet', () => {
      class SampleDeployer extends AbstractDefaultSkillDeployer {
        protected readonly minimumVersion = 'unreleased';
        slug = 'my-super-skill';

        deploy(): FileUpdates {
          throw new Error('Nope');
        }
      }

      const deployer = new SampleDeployer();

      it('returns false', () => {
        expect(deployer.isSupportedByCliVersion('whatever')).toBe(false);
      });
    });

    describe('when the deployer has a minimum version', () => {
      class SampleDeployer extends AbstractDefaultSkillDeployer {
        protected readonly minimumVersion = '0.21.0';
        slug = 'my-super-skill';

        deploy(): FileUpdates {
          throw new Error('Nope');
        }
      }

      const deployer = new SampleDeployer();

      describe('when cli version is undefined (when called in the web app)', () => {
        it('returns false', () => {
          expect(deployer.isSupportedByCliVersion(undefined)).toBe(true);
        });
      });

      describe('when cli version is below minimumVersion', () => {
        it('returns false', () => {
          expect(deployer.isSupportedByCliVersion('0.20.10')).toBe(false);
        });

        it('returns false for incoming releases too', () => {
          expect(deployer.isSupportedByCliVersion('0.20.10-next')).toBe(false);
        });
      });

      describe('when cli version is equal to minimumVersion', () => {
        it('returns true', () => {
          expect(deployer.isSupportedByCliVersion('0.21.0')).toBe(true);
        });

        it('returns true for incoming release too', () => {
          expect(deployer.isSupportedByCliVersion('0.21.0-next')).toBe(true);
        });
      });

      describe('when cli version is above minimumVersion', () => {
        it('returns true', () => {
          expect(deployer.isSupportedByCliVersion('1.2.3')).toBe(true);
        });

        it('returns true for incoming release too', () => {
          expect(deployer.isSupportedByCliVersion('1.2.3-next')).toBe(true);
        });
      });
    });
  });
});
