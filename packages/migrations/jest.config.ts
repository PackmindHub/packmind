// eslint-disable-next-line @nx/enforce-module-boundaries
import { swcTransform, standardModuleFileExtensions } from '../../jest-utils';

export default {
  displayName: 'migrations',
  preset: '../../jest.preset.ts',
  testEnvironment: 'node',
  transform: swcTransform,
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../../coverage/packages/migrations',
};
