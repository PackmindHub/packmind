// eslint-disable-next-line @nx/enforce-module-boundaries
import { swcTransform, standardModuleFileExtensions } from '../../jest-utils';

export default {
  displayName: 'llm',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: swcTransform,
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../../coverage/packages/llm',
  passWithNoTests: true,
};
