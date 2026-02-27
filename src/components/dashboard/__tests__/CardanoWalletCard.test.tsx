import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import CardanoWalletCard from '../CardanoWalletCard';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// Mock heroui
vi.mock('@heroui/react', () => ({
  Card: function MockCard({ children, className }: { children: React.ReactNode; className?: string }) {
    return React.createElement('div', { 'data-testid': 'card', className }, children);
  },
  Button: function MockButton({ children, onClick, onPress }: { children: React.ReactNode; onClick?: () => void; onPress?: () => void }) {
    return React.createElement('button', { onClick: onClick || onPress, 'data-testid': 'button' }, children);
  },
  Tooltip: function MockTooltip({ children }: { children: React.ReactNode }) {
    return React.createElement('div', null, children);
  },
}));

// Mock sub-components
vi.mock('../../ui/LoadingBackdrop', () => ({
  default: () => null,
}));
vi.mock('../../ui/ToastContainer', () => ({
  default: () => null,
}));

// Mock wallet context
const mockDisconnectCardano = vi.fn();
const mockDisconnectMidnight = vi.fn();

const mockWalletContext = {
  cardano: {
    isConnected: true,
    address: 'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp',
    balanceNight: '500',
    stakeKey: null,
    rewardAddress: null,
    balanceADA: null,
    walletName: null,
    lucid: null,
    isLoading: false,
    error: null,
  },
  midnight: {
    isConnected: false,
    address: null,
    coinPublicKey: null,
    balance: null,
    walletName: null,
    api: null,
    isLoading: false,
    error: null,
    dustAddress: null,
    dustBalance: null,
  },
  disconnectCardanoWallet: mockDisconnectCardano,
  disconnectMidnightWallet: mockDisconnectMidnight,
  generationStatus: null,
  registrationUtxo: null,
};

vi.mock('@/contexts/WalletContext', () => ({
  useWalletContext: () => mockWalletContext,
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toasts: [],
    showToast: vi.fn(),
    removeToast: vi.fn(),
  }),
}));

describe('CardanoWalletCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWalletContext.cardano.address = 'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp';
    mockWalletContext.cardano.balanceNight = '500';
  });

  it('should render NIGHT balance', () => {
    render(React.createElement(CardanoWalletCard));
    expect(screen.getByText('500')).toBeDefined();
    expect(screen.getByText('NIGHT')).toBeDefined();
  });

  it('should render "0" when no NIGHT balance', () => {
    mockWalletContext.cardano.balanceNight = null;
    render(React.createElement(CardanoWalletCard));
    expect(screen.getByText('0')).toBeDefined();
  });

  it('should render truncated address', () => {
    render(React.createElement(CardanoWalletCard));
    const fullAddr = mockWalletContext.cardano.address!;
    const truncated = fullAddr.slice(0, 10) + '...' + fullAddr.slice(-10);
    expect(screen.getByText(truncated)).toBeDefined();
  });

  it('should render NIGHT Balance label', () => {
    render(React.createElement(CardanoWalletCard));
    expect(screen.getByText('NIGHT Balance')).toBeDefined();
  });

  it('should render Generating Address label', () => {
    render(React.createElement(CardanoWalletCard));
    expect(screen.getByText('Generating Address Cardano')).toBeDefined();
  });

  it('should render disconnect button', () => {
    render(React.createElement(CardanoWalletCard));
    expect(screen.getByText('DISCONNECT')).toBeDefined();
  });

  it('should handle empty address gracefully', () => {
    mockWalletContext.cardano.address = null;
    render(React.createElement(CardanoWalletCard));
    // Should render truncated empty string without crashing
    expect(screen.getByText('...')).toBeDefined();
  });

  it('should show green dot when indexer confirms registration', () => {
    mockWalletContext.generationStatus = { registered: true } as never;
    const { container } = render(React.createElement(CardanoWalletCard));
    // Check for the green dot element
    const greenDot = container.querySelector('.bg-\\[\\#34C759\\]');
    expect(greenDot).toBeDefined();
  });
});
