import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import IndexerSyncBanner from '../IndexerSyncBanner';
import { useRuntimeConfig } from '@/contexts/RuntimeConfigContext';

// Mock heroui
vi.mock('@heroui/react', () => ({
  Card: function MockCard({ children, className }: { children: React.ReactNode; className?: string }) {
    return React.createElement('div', { 'data-testid': 'card', className }, children);
  },
  Tooltip: function MockTooltip({ children }: { children: React.ReactNode }) {
    return React.createElement('div', null, children);
  },
}));

// Mock RuntimeConfigContext
vi.mock('@/contexts/RuntimeConfigContext', () => ({
  useRuntimeConfig: vi.fn(),
}));

describe('IndexerSyncBanner', () => {
  beforeEach(() => {
    vi.mocked(useRuntimeConfig).mockReturnValue({ isPreview: false } as never);
  });

  it('should render nothing when isVisible is false', () => {
    const { container } = render(React.createElement(IndexerSyncBanner, { isVisible: false }));
    expect(container.innerHTML).toBe('');
  });

  it('should render banner when isVisible is true', () => {
    render(React.createElement(IndexerSyncBanner, { isVisible: true }));
    expect(screen.getByText('Registration Syncing')).toBeDefined();
  });

  it('should show 12 hours messaging on Preprod/Mainnet', () => {
    vi.mocked(useRuntimeConfig).mockReturnValue({ isPreview: false } as never);
    render(React.createElement(IndexerSyncBanner, { isVisible: true }));
    expect(screen.getByText('12 hours')).toBeDefined();
  });

  it('should show 2.5 hours messaging on Preview', () => {
    vi.mocked(useRuntimeConfig).mockReturnValue({ isPreview: true } as never);
    render(React.createElement(IndexerSyncBanner, { isVisible: true }));
    expect(screen.getByText('2.5 hours')).toBeDefined();
  });
});
