import React from 'react';
import { render, screen } from '@testing-library/react';
import { UIProvider } from '../../../UIProvider';
import { PMFormContainer } from './PMFormContainer';

// Helper function to render with UIProvider
const renderWithProvider = (ui: React.ReactElement) => {
  return render(<UIProvider>{ui}</UIProvider>);
};

describe('PMFormContainer', () => {
  it('renders children correctly', () => {
    renderWithProvider(
      <PMFormContainer>
        <div>Test content</div>
      </PMFormContainer>,
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies custom maxWidth', () => {
    const { container } = renderWithProvider(
      <PMFormContainer maxWidth="600px">
        <div>Test content</div>
      </PMFormContainer>,
    );

    const containerElement = container.querySelector('.chakra-container');
    expect(containerElement).toHaveStyle('max-width: 600px');
  });

  it('applies custom className', () => {
    const { container } = renderWithProvider(
      <PMFormContainer className="custom-class">
        <div>Test content</div>
      </PMFormContainer>,
    );

    const containerElement = container.querySelector('.custom-class');
    expect(containerElement).toBeInTheDocument();
  });

  it('renders multiple children with proper spacing', () => {
    renderWithProvider(
      <PMFormContainer spacing={6}>
        <div>First item</div>
        <div>Second item</div>
        <div>Third item</div>
      </PMFormContainer>,
    );

    expect(screen.getByText('First item')).toBeInTheDocument();
    expect(screen.getByText('Second item')).toBeInTheDocument();
    expect(screen.getByText('Third item')).toBeInTheDocument();
  });

  it('renders with default props', () => {
    renderWithProvider(
      <PMFormContainer>
        <div>Default content</div>
      </PMFormContainer>,
    );

    expect(screen.getByText('Default content')).toBeInTheDocument();
  });
});
