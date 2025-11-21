import React from 'react';
import { render, screen } from '@testing-library/react';
import { UIProvider } from '@packmind/ui';
import { AccordionSection } from './AccordionSection';

const renderWithContext = (props: {
  value: string;
  defaultOpen: boolean;
  triggerContent: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
}) => {
  return render(
    <UIProvider>
      <AccordionSection {...props} />
    </UIProvider>,
  );
};

describe('AccordionSection', () => {
  it('renders trigger content', () => {
    renderWithContext({
      value: 'test',
      defaultOpen: false,
      triggerContent: <div>Test Trigger</div>,
      children: <div>Test Content</div>,
    });

    expect(screen.getByText('Test Trigger')).toBeInTheDocument();
  });

  describe('when defaultOpen is true', () => {
    it('renders children content', () => {
      renderWithContext({
        value: 'test',
        defaultOpen: true,
        triggerContent: <div>Test Trigger</div>,
        children: <div>Test Content</div>,
      });

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  describe('when disabled is true', () => {
    it('does not render children even if defaultOpen is true', () => {
      renderWithContext({
        value: 'test',
        defaultOpen: true,
        triggerContent: <div>Test Trigger</div>,
        children: <div>Test Content</div>,
        disabled: true,
      });

      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });

    it('renders trigger content', () => {
      renderWithContext({
        value: 'test',
        defaultOpen: true,
        triggerContent: <div>Test Trigger</div>,
        children: <div>Test Content</div>,
        disabled: true,
      });

      expect(screen.getByText('Test Trigger')).toBeInTheDocument();
    });
  });
});
