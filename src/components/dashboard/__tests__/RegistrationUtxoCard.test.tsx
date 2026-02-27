import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import RegistrationUtxoCard from '../RegistrationUtxoCard';

// Mock heroui
vi.mock('@heroui/react', () => ({
  Tooltip: function MockTooltip({ children }: { children: React.ReactNode }) {
    return React.createElement('div', null, children);
  },
}));

// Mock sub-components
vi.mock('../../ui/ToastContainer', () => ({
  default: () => null,
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toasts: [],
    showToast: vi.fn(),
    removeToast: vi.fn(),
  }),
}));

// Mock wallet context
const mockWalletContext = {
  registrationUtxo: null as null | {
    txHash: string;
    outputIndex: number;
    address: string;
    datum: string | null;
  },
};

vi.mock('@/contexts/WalletContext', () => ({
  useWalletContext: () => mockWalletContext,
}));

describe('RegistrationUtxoCard', () => {
  beforeEach(() => {
    mockWalletContext.registrationUtxo = null;
  });

  it('should return null when no registration UTxO', () => {
    const { container } = render(React.createElement(RegistrationUtxoCard));
    expect(container.innerHTML).toBe('');
  });

  it('should render transaction hash when UTxO present', () => {
    mockWalletContext.registrationUtxo = {
      txHash: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
      outputIndex: 0,
      address: 'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp',
      datum: null,
    };

    render(React.createElement(RegistrationUtxoCard));
    expect(screen.getByText('Transaction Hash')).toBeDefined();
    // Truncated hash: first 8 + ... + last 8
    expect(screen.getByText('abc123de...f456abc1')).toBeDefined();
  });

  it('should render address when UTxO present', () => {
    mockWalletContext.registrationUtxo = {
      txHash: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
      outputIndex: 0,
      address: 'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp',
      datum: null,
    };

    render(React.createElement(RegistrationUtxoCard));
    expect(screen.getByText('Address')).toBeDefined();
    // Truncated address: first 12 + ... + last 12
    const addr = mockWalletContext.registrationUtxo.address;
    const truncated = addr.slice(0, 12) + '...' + addr.slice(-12);
    expect(screen.getByText(truncated)).toBeDefined();
  });

  it('should render datum when present', () => {
    mockWalletContext.registrationUtxo = {
      txHash: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
      outputIndex: 0,
      address: 'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp',
      datum: 'd87980d87a9f581cdeadbeef01234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef01234567ff',
    };

    render(React.createElement(RegistrationUtxoCard));
    expect(screen.getByText('Datum')).toBeDefined();
  });

  it('should not render datum section when datum is null', () => {
    mockWalletContext.registrationUtxo = {
      txHash: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
      outputIndex: 0,
      address: 'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp',
      datum: null,
    };

    render(React.createElement(RegistrationUtxoCard));
    expect(screen.queryByText('Datum')).toBeNull();
  });

  it('should show proof description text', () => {
    mockWalletContext.registrationUtxo = {
      txHash: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
      outputIndex: 0,
      address: 'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp',
      datum: null,
    };

    render(React.createElement(RegistrationUtxoCard));
    expect(screen.getByText(/On-chain proof/)).toBeDefined();
  });
});
