import { resolveContextView } from './resolveContextView';

describe('resolveContextView', () => {
  describe('when the space has no package', () => {
    describe('and no component either', () => {
      it('replaces the surface with the blank state', () => {
        expect(
          resolveContextView({
            packageCount: 0,
            componentCount: 0,
            requestsInventory: false,
          }),
        ).toBe('blank');
      });
    });

    describe('and components nothing carries', () => {
      it('opens on the inventory rather than claiming the space is empty', () => {
        expect(
          resolveContextView({
            packageCount: 0,
            componentCount: 4,
            requestsInventory: false,
          }),
        ).toBe('inventory');
      });

      describe('and the address asks for the inventory', () => {
        it('stays on the inventory', () => {
          expect(
            resolveContextView({
              packageCount: 0,
              componentCount: 4,
              requestsInventory: true,
            }),
          ).toBe('inventory');
        });
      });
    });
  });

  describe('when the space has packages', () => {
    it('reads a package', () => {
      expect(
        resolveContextView({
          packageCount: 2,
          componentCount: 7,
          requestsInventory: false,
        }),
      ).toBe('package');
    });

    describe('and the address asks for the inventory', () => {
      it('shows the inventory instead', () => {
        expect(
          resolveContextView({
            packageCount: 2,
            componentCount: 7,
            requestsInventory: true,
          }),
        ).toBe('inventory');
      });
    });

    describe('and no component in any of them', () => {
      it('still reads a package, which is where the first one is created', () => {
        expect(
          resolveContextView({
            packageCount: 1,
            componentCount: 0,
            requestsInventory: false,
          }),
        ).toBe('package');
      });
    });
  });
});
