// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  swcTransformWithDefineFields,
  standardModuleFileExtensions,
} from '../../jest-utils';

export default {
  displayName: 'packmind-cli',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: swcTransformWithDefineFields,
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../../coverage/apps/cli',
};
