import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import IndexerSyncBanner from '../IndexerSyncBanner';

// Mock heroui
vi.mock('@heroui/react', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'card', className }, children),
  Tooltip: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
}));

describe('IndexerSyncBanner', () => {
  it('should render nothing when isVisible is false', () => {
    const { container } = render(React.createElement(IndexerSyncBanner, { isVisible: false }));
    expect(container.innerHTML).toBe('');
  });

  it('should render banner when isVisible is true', () => {
    render(React.createElement(IndexerSyncBanner, { isVisible: true }));
    expect(screen.getByText('Registration Syncing')).toBeDefined();
  });

  it('should show 12 hours messaging', () => {
    render(React.createElement(IndexerSyncBanner, { isVisible: true }));
    expect(screen.getByText('12 hours')).toBeDefined();
  });
});
