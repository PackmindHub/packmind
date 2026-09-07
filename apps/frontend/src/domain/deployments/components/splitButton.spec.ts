import { SPLIT_BUTTON_SEAM, splitButtonHalf } from './splitButton';

describe('splitButtonHalf', () => {
  describe('when the button is the leading half', () => {
    it('squares the edge it shares with the chevron', () => {
      expect(splitButtonHalf('leading')).toMatchObject({ borderEndRadius: 0 });
    });

    it('leaves the outer edge rounded', () => {
      expect(splitButtonHalf('leading')).not.toHaveProperty(
        'borderStartRadius',
      );
    });
  });

  describe('when the button is the trailing half', () => {
    it('squares the edge it shares with the wide half', () => {
      expect(splitButtonHalf('trailing')).toMatchObject({
        borderStartRadius: 0,
      });
    });

    it('leaves the outer edge rounded', () => {
      expect(splitButtonHalf('trailing')).not.toHaveProperty('borderEndRadius');
    });
  });

  /*
   * The pin the reported bug asks for: the ring reaches its own width past the
   * button's edge, and the seam is that width, so a focused half stops at its
   * neighbour instead of drawing over it. Loosen either number and the halves
   * overlap again.
   */
  describe('when a half is focused', () => {
    it('hugs the leading half with the ring', () => {
      expect(splitButtonHalf('leading').outlineOffset).toBe(0);
    });

    it('hugs the trailing half with the ring', () => {
      expect(splitButtonHalf('trailing').outlineOffset).toBe(0);
    });

    it('leaves the seam as wide as the ring that has to fit in it', () => {
      expect(SPLIT_BUTTON_SEAM).toBe('2px');
    });
  });
});
