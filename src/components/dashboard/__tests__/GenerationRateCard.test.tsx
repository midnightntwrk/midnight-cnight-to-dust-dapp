import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import GenerationRateCard from '../GenerationRateCard';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// Mock specksToTDust
vi.mock('@/lib/specksToTDust', () => ({
  specksToTDust: vi.fn((s: string) => `converted_${s}`),
}));

// Mock heroui
vi.mock('@heroui/card', () => ({
  Card: function MockCard({ children, className }: { children: React.ReactNode; className?: string }) {
    return React.createElement('div', { 'data-testid': 'card', className }, children);
  },
}));

vi.mock('@heroui/tooltip', () => ({
  Tooltip: function MockTooltip({ children }: { children: React.ReactNode }) {
    return React.createElement('div', null, children);
  },
}));

// Mock WalletContext
const mockWalletContext = {
  generationStatus: null as null | {
    registered: boolean;
    generationRate: string;
    currentCapacity: string;
    maxCapacity: string;
  },
  registrationUtxo: null as null | object,
};

vi.mock('@/contexts/WalletContext', () => ({
  useWalletContext: () => mockWalletContext,
}));

describe('GenerationRateCard', () => {
  beforeEach(() => {
    mockWalletContext.generationStatus = null;
    mockWalletContext.registrationUtxo = null;
  });

  it('should render "..." when indexer is syncing', () => {
    mockWalletContext.registrationUtxo = { txHash: 'abc', outputIndex: 0 };
    mockWalletContext.generationStatus = {
      registered: false,
      generationRate: '0',
      currentCapacity: '0',
      maxCapacity: '0',
    };

    render(React.createElement(GenerationRateCard));
    // Both generation rate and CAP show "..." when syncing
    const dots = screen.getAllByText('...');
    expect(dots.length).toBeGreaterThanOrEqual(1);
  });

  it('should render converted generation rate when indexer is synced', () => {
    mockWalletContext.generationStatus = {
      registered: true,
      generationRate: '500000000000000',
      currentCapacity: '2000000000000000',
      maxCapacity: '5000000000000000',
    };

    render(React.createElement(GenerationRateCard));
    expect(screen.getByText('converted_500000000000000')).toBeDefined();
  });

  it('should render converted CAP from indexer maxCapacity when synced', () => {
    mockWalletContext.generationStatus = {
      registered: true,
      generationRate: '500000000000000',
      currentCapacity: '2000000000000000',
      maxCapacity: '5000000000000000',
    };

    render(React.createElement(GenerationRateCard));
    expect(screen.getByText('converted_5000000000000000')).toBeDefined();
  });

  it('should show "0" for CAP when not registered and not syncing', () => {
    render(React.createElement(GenerationRateCard));
    // Both generation rate and CAP show "0"
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(1);
  });

  it('should render Generation Rate and CAP labels', () => {
    render(React.createElement(GenerationRateCard));
    expect(screen.getByText('Generation Rate')).toBeDefined();
    expect(screen.getByText('CAP')).toBeDefined();
  });

  it('should render DUST/h unit', () => {
    render(React.createElement(GenerationRateCard));
    expect(screen.getByText('DUST/h')).toBeDefined();
  });

  it('should render DUST unit for CAP', () => {
    render(React.createElement(GenerationRateCard));
    const dustLabels = screen.getAllByText('DUST');
    expect(dustLabels.length).toBeGreaterThanOrEqual(1);
  });
});
