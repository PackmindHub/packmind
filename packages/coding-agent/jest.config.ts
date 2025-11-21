// eslint-disable-next-line @nx/enforce-module-boundaries
import { swcTransform, standardModuleFileExtensions } from '../../jest-utils';

export default {
  displayName: 'coding-agent',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: swcTransform,
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../../coverage/packages/coding-agent',
  transformIgnorePatterns: ['node_modules/(?!(slug)/)'],
};
