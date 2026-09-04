import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';

import { ContextPackageDescription } from './ContextPackageDescription';

/**
 * jsdom lays nothing out, so every box is zero tall and the component would
 * always read "it fits". The two geometries it asks for are stubbed instead:
 * the clamped box's height, which is a constant, and the content's natural
 * height, which is what each test is really varying.
 */
const COLLAPSED_HEIGHT = 51;

function givenContentHeight(height: number) {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get: () => COLLAPSED_HEIGHT,
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    get: () => height,
  });
}

const LONG = '## How this package is used\n\n'.concat(
  'This is the frontend package. '.repeat(60),
);

const renderDescription = (description: string) =>
  render(
    <UIProvider>
      <ContextPackageDescription
        packageName="Frontend"
        description={description}
      />
    </UIProvider>,
  );

describe('ContextPackageDescription', () => {
  afterEach(() => {
    Reflect.deleteProperty(HTMLElement.prototype, 'clientHeight');
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollHeight');
  });

  describe('when the description fits', () => {
    beforeEach(() => {
      givenContentHeight(30);
      renderDescription('The commands that cut a version.');
    });

    it('shows the description', () => {
      expect(
        screen.getByText('The commands that cut a version.'),
      ).toBeInTheDocument();
    });

    it('offers no way in', () => {
      expect(
        screen.queryByRole('button', { name: 'Read description' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when a paragraph is written over several lines', () => {
    beforeEach(() => {
      givenContentHeight(30);
      renderDescription('The commands\nthat cut a version.');
    });

    it('offers no way in, since the panel would show the same paragraph', () => {
      expect(
        screen.queryByRole('button', { name: 'Read description' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the prose fits but the markdown carried more', () => {
    beforeEach(() => {
      givenContentHeight(30);
      renderDescription('Run `nx test frontend` first.');
    });

    it('previews it without the backticks', () => {
      expect(
        screen.getByText('Run nx test frontend first.'),
      ).toBeInTheDocument();
    });

    it('still offers a way to the real thing', () => {
      expect(
        screen.getByRole('button', { name: 'Read description' }),
      ).toBeInTheDocument();
    });
  });

  describe('when the description is taller than the header allows', () => {
    beforeEach(() => {
      givenContentHeight(600);
      renderDescription(LONG);
    });

    it('offers a way to read the rest', () => {
      expect(
        screen.getByRole('button', { name: 'Read description' }),
      ).toBeInTheDocument();
    });

    it('keeps the panel shut until asked', () => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    describe('and the reader asks for it', () => {
      beforeEach(async () => {
        await userEvent.click(
          screen.getByRole('button', { name: 'Read description' }),
        );
      });

      it('opens a panel', () => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      it('titles it after the package', () => {
        expect(
          screen.getByRole('heading', { name: 'Frontend' }),
        ).toBeInTheDocument();
      });

      it('renders the markdown as markdown', () => {
        expect(
          screen.getByRole('heading', { name: 'How this package is used' }),
        ).toBeInTheDocument();
      });
    });
  });
});
