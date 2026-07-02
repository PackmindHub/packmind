import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { DownloadAsAgentButton } from './DownloadAsAgentButton';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';

jest.mock('../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: jest.fn(),
}));

jest.mock('../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: jest.fn(),
}));

const renderWithProviders = (component: React.ReactElement) =>
  render(<UIProvider>{component}</UIProvider>);

describe('DownloadAsAgentButton', () => {
  const getPreviewCommand = jest.fn().mockReturnValue({
    recipeVersions: [],
    standardVersions: [],
    skillVersions: [],
  });
  let clickSpy: jest.SpyInstance;
  let createObjectURLMock: jest.Mock;
  let revokeObjectURLMock: jest.Mock;
  let lastAnchor: HTMLAnchorElement | null;
  const originalCreateObjectURL = (
    URL as unknown as { createObjectURL?: (obj: Blob) => string }
  ).createObjectURL;
  const originalRevokeObjectURL = (
    URL as unknown as { revokeObjectURL?: (url: string) => void }
  ).revokeObjectURL;

  beforeEach(() => {
    (useAuthContext as jest.Mock).mockReturnValue({
      organization: { id: 'org-1' },
    });
    (useCurrentSpace as jest.Mock).mockReturnValue({ spaceId: 'space-1' });

    lastAnchor = null;
    const originalCreateElement = document.createElement.bind(document);
    jest
      .spyOn(document, 'createElement')
      .mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'a') {
          lastAnchor = element as HTMLAnchorElement;
        }
        return element;
      });

    clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    createObjectURLMock = jest.fn().mockReturnValue('blob:mock');
    revokeObjectURLMock = jest.fn();
    (URL as unknown as { createObjectURL: jest.Mock }).createObjectURL =
      createObjectURLMock;
    (URL as unknown as { revokeObjectURL: jest.Mock }).revokeObjectURL =
      revokeObjectURLMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (URL as unknown as { createObjectURL?: unknown }).createObjectURL =
      originalCreateObjectURL;
    (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL =
      originalRevokeObjectURL;
  });

  const mockFetchResponse = (contentDisposition: string | null) => {
    const headerStore = new Map<string, string>();
    if (contentDisposition) {
      headerStore.set('content-disposition', contentDisposition);
    }
    const response = {
      ok: true,
      statusText: 'OK',
      headers: {
        get: (name: string) => headerStore.get(name.toLowerCase()) ?? null,
      },
      blob: async () => new Blob(['zip-bytes']),
    } as unknown as Response;
    (globalThis as unknown as { fetch: jest.Mock }).fetch = jest
      .fn()
      .mockResolvedValue(response);
  };

  const triggerClaudeDownload = async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /download for agent/i }),
    );
    await userEvent.click(screen.getByRole('button', { name: /claude/i }));
  };

  it('uses the filename from Content-Disposition when present', async () => {
    mockFetchResponse('attachment; filename="packmind-claude-my-slug.zip"');

    renderWithProviders(
      <DownloadAsAgentButton getPreviewCommand={getPreviewCommand} />,
    );

    await triggerClaudeDownload();

    await waitForAnchor(() => lastAnchor);
    expect(lastAnchor?.download).toBe('packmind-claude-my-slug.zip');
    expect(clickSpy).toHaveBeenCalled();
    expect(createObjectURLMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalled();
  });

  it('falls back to the legacy name when Content-Disposition is missing', async () => {
    mockFetchResponse(null);

    renderWithProviders(
      <DownloadAsAgentButton getPreviewCommand={getPreviewCommand} />,
    );

    await triggerClaudeDownload();

    await waitForAnchor(() => lastAnchor);
    expect(lastAnchor?.download).toBe('packmind-claude-preview.zip');
  });

  it('falls back to the legacy name when Content-Disposition is malformed', async () => {
    mockFetchResponse('attachment; something-else');

    renderWithProviders(
      <DownloadAsAgentButton getPreviewCommand={getPreviewCommand} />,
    );

    await triggerClaudeDownload();

    await waitForAnchor(() => lastAnchor);
    expect(lastAnchor?.download).toBe('packmind-claude-preview.zip');
  });
});

async function waitForAnchor(get: () => HTMLAnchorElement | null) {
  await waitFor(() => {
    expect(get()).not.toBeNull();
  });
}
