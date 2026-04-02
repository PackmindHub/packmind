import {
  describeWithUserSignedUp,
  describeForVersion,
  RunCliResult,
  UserSignedUpContext,
} from './helpers';
import { Package } from '@packmind/types';

describeForVersion('>= 0.24.0', 'packages inspect commands', () => {
  describeWithUserSignedUp('packages list and show', (getContext) => {
    let context: UserSignedUpContext;
    let pkg: Package;

    beforeEach(async () => {
      context = await getContext();

      const createPackageResponse = await context.gateway.packages.create({
        name: 'Test inspect package',
        description: 'A package used to test list and show commands',
        recipeIds: [],
        standardIds: [],
        spaceId: context.space.id,
      });
      pkg = createPackageResponse.package;
    });

    describe('packages list', () => {
      let result: RunCliResult;

      beforeEach(async () => {
        result = await context.runCli('packages list');
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('displays the package name', () => {
        expect(result.stdout).toContain('Test inspect package');
      });

      it('displays the scoped package slug', () => {
        expect(result.stdout).toContain(`@${context.space.slug}/${pkg.slug}`);
      });
    });

    describe('packages show with unscoped slug', () => {
      let result: RunCliResult;

      beforeEach(async () => {
        result = await context.runCli(`packages show ${pkg.slug}`);
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('displays the package name', () => {
        expect(result.stdout).toContain('Test inspect package');
      });

      it('displays the package description', () => {
        expect(result.stdout).toContain(
          'A package used to test list and show commands',
        );
      });
    });

    describe('packages show with scoped slug', () => {
      let result: RunCliResult;

      beforeEach(async () => {
        result = await context.runCli(
          `packages show @${context.space.slug}/${pkg.slug}`,
        );
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('displays the package name', () => {
        expect(result.stdout).toContain('Test inspect package');
      });
    });
  });
});
