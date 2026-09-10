import { editionFromDeploymentValue } from './PackmindEdition';

describe('editionFromDeploymentValue', () => {
  describe.each(['proprietary', 'cloud'])(
    'when the deployment value is %s',
    (raw) => {
      it('resolves the enterprise edition', () => {
        expect(editionFromDeploymentValue(raw)).toBe('enterprise');
      });
    },
  );

  // The published name is not an input. `apps/api/webpack.config.js` compiles
  // the Community stubs for anything but `proprietary`, so answering
  // `enterprise` here would announce routes the binary does not have.
  describe('when the deployment value is the published name enterprise', () => {
    it('resolves the community edition, matching what was built', () => {
      expect(editionFromDeploymentValue('enterprise')).toBe('community');
    });
  });

  describe.each([
    ['oss', 'oss'],
    ['unset', undefined],
    ['absent from the config', null],
    ['empty', ''],
    ['a name nobody ships', 'starship'],
  ])('when the deployment value is %s', (_label, raw) => {
    it('resolves the community edition', () => {
      expect(editionFromDeploymentValue(raw)).toBe('community');
    });
  });
});
