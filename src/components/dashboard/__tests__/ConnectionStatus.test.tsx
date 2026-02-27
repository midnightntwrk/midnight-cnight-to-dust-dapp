import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ConnectionStatus from '../ConnectionStatus';

// Mock heroui
vi.mock('@heroui/react', () => ({
  Chip: function MockChip({ children }: { children: React.ReactNode }) {
    return React.createElement('span', { 'data-testid': 'chip' }, children);
  },
  Progress: function MockProgress({ value }: { value: number }) {
    return React.createElement('div', { 'data-testid': 'progress', 'data-value': value });
  },
}));

// Mock wallet context
const mockWalletContext = {
  cardano: { isConnected: false },
  midnight: { isConnected: false },
};

vi.mock('@/contexts/WalletContext', () => ({
  useWalletContext: () => mockWalletContext,
}));

describe('ConnectionStatus', () => {
  beforeEach(() => {
    mockWalletContext.cardano = { isConnected: false };
    mockWalletContext.midnight = { isConnected: false };
  });

  it('should show "Not Connected" when no wallets connected', () => {
    render(React.createElement(ConnectionStatus));
    expect(screen.getByText('0%')).toBeDefined();
    const chips = screen.getAllByText('Disconnected');
    expect(chips).toHaveLength(2);
  });

  it('should show "Partially Connected" when one wallet connected', () => {
    mockWalletContext.cardano.isConnected = true;
    render(React.createElement(ConnectionStatus));
    expect(screen.getByText('50%')).toBeDefined();
    expect(screen.getByText('Connected')).toBeDefined();
    expect(screen.getByText('Disconnected')).toBeDefined();
  });

  it('should show "Both Connected" when both wallets connected', () => {
    mockWalletContext.cardano.isConnected = true;
    mockWalletContext.midnight.isConnected = true;
    render(React.createElement(ConnectionStatus));
    expect(screen.getByText('100%')).toBeDefined();
    const chips = screen.getAllByText('Connected');
    expect(chips).toHaveLength(2);
  });

  it('should render Cardano Wallet label', () => {
    render(React.createElement(ConnectionStatus));
    expect(screen.getByText('Cardano Wallet')).toBeDefined();
  });

  it('should render Midnight Wallet label', () => {
    render(React.createElement(ConnectionStatus));
    expect(screen.getByText('Midnight Wallet')).toBeDefined();
  });
});
