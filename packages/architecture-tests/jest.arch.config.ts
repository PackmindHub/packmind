const { compilerOptions } = require('../../tsconfig.base.effective.json');

const {
  pathsToModuleNameMapper,
  swcTransform,
  standardTransformIgnorePatterns,
  standardModuleFileExtensions,
} = require('../../jest-utils.ts');

// Named `jest.arch.config.ts` (not `jest.config.ts`) on purpose: it keeps the
// @nx/jest plugin from inferring a `test` target for this project, so the
// architecture suite stays OFF `nx run-many -t test` and is only ever run via
// the dedicated `arch` target (`npm run test:arch`).
module.exports = {
  displayName: 'architecture-tests',
  preset: '../../jest.preset.ts',
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.arch.spec.ts'],
  transform: swcTransform,
  transformIgnorePatterns: standardTransformIgnorePatterns,
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../../coverage/packages/architecture-tests',
  moduleNameMapper: pathsToModuleNameMapper(
    compilerOptions.paths,
    '<rootDir>/../../',
  ),
};
